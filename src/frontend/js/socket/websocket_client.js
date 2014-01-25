/**
 * Seashell's communications backend.
 * Copyright (C) 2013 The Seashell Maintainers.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See also 'ADDITIONAL TERMS' at the end of the included LICENSE file.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/** Seashell's Websocket Communication Class.
 * @constructor
 * @param {String} uri - URI to connect to.  Should look like ws://[IP of linux student environment host]:[some port]/.  Encryption is not handled through SSL.
 * @param {Array} key - Array of 4 words that represent the 128-bit AES session key.
 *
 * Implementor's note - this class must maintain consistent with
 * the code written in server.rkt.
 *
 * TODO: Exception handling on bad keys.  Probably want to redirect
 * to the login page _again_ with a reason.
 *
 * Invocation:
 *  ws = new SeashellWebsocket( ... )
 */
function SeashellWebsocket(uri, key) {
  var self = this;

  self.coder = new SeashellCoder(key);
  self.lastRequest = 0;
  self.requests = {};
  self.ready = $.Deferred();
  self.authenticated = false;

  // Ready to authenticate [-1]
  self.requests[-1] = {
    deferred : $.Deferred().done(self._authenticate)
  };
  // Failure [-2]
  self.requests[-2] = {
    callback : null,
    deferred : null
  };

  self.websocket = new WebSocket(uri);

  this.websocket.onmessage = function(message) {
    // We receive all messages in binary,
    // then we decrypt and extract out the nice
    // JSON.
    var readerT = new FileReader();
    console.log(readerT);
    readerT.onloadend = function() {
        var response_string = readerT.result;
        var response = JSON.parse(response_string);
        // Assume that response holds the message and response.id holds the
        // message identifier that corresponds with it.
        //
        // response.result will hold the result if the API call succeeded,
        // error message otherwise. 
        var request = self.requests[response.id];
        if (response.success) {
          if (request.deferred) {
            request.deferred.resolve(response.result, self);
          }
          if (request.callback) {
            response.callback(true, response.result, self);
          }
        } else {
          if (request.deferred) {
            request.deferred.reject(response.result, self);
          }
          if (request.callback) {
            response.callback(false, response.result, self);
          }
        }
        if (response.id >= 0)
           delete self.requests[response.id];
    };
    readerT.readAsText(message.data);
  };
}

/** Closes the connection.
 */
SeashellWebsocket.prototype.close = function(self) {
  this.websocket.close();
};

/** Does the client-server mutual authentication.  Internal use only. */
SeashellWebsocket.prototype._authenticate = function(ignored, self) {
  /** First send a message so we can test if the server is who he claims
   *  he is. */
  self._sendMessage({type : "serverAuth"}).done(
      function(response) {
        iv = response[0];
        coded = response[1];
        tag = response[2];

        try {
          /** We don't care that it decrypted.
           *  We just care that it decrypted properly. */
          self.coder.decrypt(coded, iv, tag, []);
          /** OK, now we proceed to authenticate. */
          self._sendMessage({type : "clientAuth",
                             data : self.coder.encrypt([80, 42, 64, 90, 45, 32, 98, 87, 67, 25,
                                                        32, 96, 50, 22, 75, 62, 108, 255, 7, 1],
                                                        [])}).done(
            function(result) {
              self.authenticated = true;
              self.ready.resolve("Ready!");
            })
            .fail(
              function(result) {
                self.ready.reject("Authentication error!");
              });
        } catch(error) {
          self.ready.reject("Authentication error!");
        }
      }).fail(
        function(result) {
          self.ready.reject("Authentication error!");
        });
};

/** Sends a message along the connection.  Internal use only.
 *
 * @param {Object} message - JSON message to send (as JavaScript object).
 * @returns {Promise} - jQuery promise.
 */
SeashellWebsocket.prototype._sendMessage = function(message) {
  var self = this;
  // Reserve a slot for the message.
  var request_id = self.lastRequest++;
  self.requests[request_id] = message;
  message.id = request_id;
  // Stringify, write out as Array of bytes.
  var blob = new Blob([JSON.stringify(message)]);
  // Grab a deferred for the message:
  self.requests[request_id].deferred = $.Deferred();
  try {
    // Send the message:
    self.websocket.send(blob);
    return self.requests[request_id].deferred.promise();
  } catch (err) {
    return self.requests[request_id].deferred.reject(err).promise();
  }
};

/** Sends a message along the connection, ensuring that
 *  the server and client are properly authenticated. */
SeashellWebsocket.prototype.sendMessage = function(message) {
  var self = this;
  if (self.authenticated) {
    return self._sendMessage(message);
  } else {
    return $.Deferred().reject(null).promise();
  }
};

/** The following functions are wrappers around sendMessage.
 *  Consult server.rkt for a full list of functions.
 *  These functions take in arguments as specified in server.rkt
 *  and return a JQuery Deferred object. */
SeashellWebsocket.prototype.runProgram = function(project) {
  return this.sendMessage({
    type : "runProgram",
    name : project});
};

SeashellWebsocket.prototype.compileProgram = function(project) {
  return this.sendMessage({
    type : "compileProgram",
    name : project});
};

SeashellWebsocket.prototype.getProjects = function() {
  return this.sendMessage({
    type : "getProjects"});
};

SeashellWebsocket.prototype.listProject = function(name) {
  return this.sendMessage({
    type : "listProject",
    project : name});
};

SeashellWebsocket.prototype.newProject = function(name) {
  return this.sendMessage({
    type : "newProject",
    project : name});
};

SeashellWebsocket.prototype.deleteProject = function(name) {
  return this.sendMessage({
    type : "deleteProject",
    project : name});
};

SeashellWebsocket.prototype.readFile = function(name, file_name) {
  return this.sendMessage({
    type : "readFile",
    project : name,
    file : file_name});
};

SeashellWebsocket.prototype.writeFile = function(project, file_name, file_content) {
  return this.sendMessage({
    type : "writeFile",
    project : name,
    file : file_name,
    contents : file_content});
};

SeashellWebsocket.prototype.deleteFile = function(file_name, file_namet) {
  return this.sendMessage({
    type : "writeFile",
    project : name,
    file : file_name});
};
