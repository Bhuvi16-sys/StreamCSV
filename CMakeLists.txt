
cmake_minimum_required(VERSION 3.20)

project(StreamCSV
    VERSION 0.1.0
    DESCRIPTION "A bounded-memory streaming CSV library"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(streamcsv
    src/reader.cpp
)

target_include_directories(streamcsv
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(streamcsv-cli
    src/cli/main.cpp
)

target_link_libraries(streamcsv-cli
    PRIVATE streamcsv
)

if(MSVC)
    target_compile_options(streamcsv PRIVATE /W4)
    target_compile_options(streamcsv-cli PRIVATE /W4)
else()
    target_compile_options(streamcsv PRIVATE
        -Wall -Wextra -Wpedantic
    )
    target_compile_options(streamcsv-cli PRIVATE
        -Wall -Wextra -Wpedantic
    )
endif()

include(CTest)

if(BUILD_TESTING)
    add_subdirectory(tests)
endif()
