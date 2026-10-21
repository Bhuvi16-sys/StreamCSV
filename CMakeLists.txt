cmake_minimum_required(VERSION 3.20)

project(StreamCSV
    VERSION 0.1.0
    DESCRIPTION "A bounded-memory streaming CSV library and CLI"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4 /permissive-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Sanitizers (ASan & UBSan)
option(STREAMCSV_ENABLE_ASAN "Enable AddressSanitizer and UndefinedBehaviorSanitizer" OFF)
if(STREAMCSV_ENABLE_ASAN)
    if(MSVC)
        add_compile_options(/fsanitize=address)
    else()
        add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
        add_link_options(-fsanitize=address,undefined)
    endif()
endif()

# Core StreamCSV Library
add_library(streamcsv
    src/char_source.cpp
    src/reader.cpp
    src/schema.cpp
    src/writer.cpp
)

add_library(streamcsv::streamcsv ALIAS streamcsv)

target_include_directories(streamcsv
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# StreamCSV CLI Executable
add_executable(streamcsv_cli
    src/cli/main.cpp
)
set_target_properties(streamcsv_cli PROPERTIES OUTPUT_NAME "streamcsv")
target_link_libraries(streamcsv_cli PRIVATE streamcsv::streamcsv)

# Optional Examples
option(STREAMCSV_BUILD_EXAMPLES "Build example applications" ON)
if(STREAMCSV_BUILD_EXAMPLES AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/examples/basic_read.cpp")
    add_executable(basic_read examples/basic_read.cpp)
    target_link_libraries(basic_read PRIVATE streamcsv::streamcsv)
endif()
if(STREAMCSV_BUILD_EXAMPLES AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/examples/basic_write.cpp")
    add_executable(basic_write examples/basic_write.cpp)
    target_link_libraries(basic_write PRIVATE streamcsv::streamcsv)
endif()

# Optional Benchmarks
option(STREAMCSV_BUILD_BENCHMARKS "Build performance benchmarks" ON)
if(STREAMCSV_BUILD_BENCHMARKS AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/benchmarks/benchmark.cpp")
    add_executable(benchmark benchmarks/benchmark.cpp)
    target_link_libraries(benchmark PRIVATE streamcsv::streamcsv)
endif()

# Optional Fuzzing Target
option(STREAMCSV_BUILD_FUZZERS "Build fuzzing harnesses" ON)
if(STREAMCSV_BUILD_FUZZERS AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/fuzz/fuzz_reader.cpp")
    add_executable(fuzz_reader fuzz/fuzz_reader.cpp)
    target_link_libraries(fuzz_reader PRIVATE streamcsv::streamcsv)
endif()

# Testing
include(CTest)
option(STREAMCSV_BUILD_TESTS "Build test suite" ON)
if(BUILD_TESTING OR STREAMCSV_BUILD_TESTS)
    add_subdirectory(tests)
endif()
