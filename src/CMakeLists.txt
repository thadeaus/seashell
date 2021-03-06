# Seashell
# Copyright (C) 2012-2014 The Seashell Maintainers.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# See also 'ADDITIONAL TERMS' at the end of the included LICENSE file.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
cmake_minimum_required(VERSION 2.6)


# Variable needed for backend and collects.
if(${CMAKE_BUILD_TYPE} STREQUAL "Debug")
  set(SEASHELL_DEBUG 1)
else(${CMAKE_BUILD_TYPE} STREQUAL "Release")
  set(SEASHELL_DEBUG 0)
endif(${CMAKE_BUILD_TYPE} STREQUAL "Debug")

# (Racket binary location)
find_program(SEASHELL_RACKET racket)

# Components
add_subdirectory(backend)
add_subdirectory(collects)
add_subdirectory(frontend)
add_subdirectory(runtime)
add_subdirectory(tests)
