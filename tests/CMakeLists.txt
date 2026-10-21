add_executable(test_types test_types.cpp)
target_link_libraries(test_types PRIVATE streamcsv::streamcsv)
add_test(NAME test_types COMMAND test_types)

add_executable(test_char_source test_char_source.cpp)
target_link_libraries(test_char_source PRIVATE streamcsv::streamcsv)
add_test(NAME test_char_source COMMAND test_char_source)

add_executable(test_reader test_reader.cpp)
target_link_libraries(test_reader PRIVATE streamcsv::streamcsv)
add_test(NAME test_reader COMMAND test_reader)

add_executable(test_errors test_errors.cpp)
target_link_libraries(test_errors PRIVATE streamcsv::streamcsv)
add_test(NAME test_errors COMMAND test_errors)

add_executable(test_schema test_schema.cpp)
target_link_libraries(test_schema PRIVATE streamcsv::streamcsv)
add_test(NAME test_schema COMMAND test_schema)

add_executable(test_writer test_writer.cpp)
target_link_libraries(test_writer PRIVATE streamcsv::streamcsv)
add_test(NAME test_writer COMMAND test_writer)

add_executable(test_cli test_cli.cpp)
target_link_libraries(test_cli PRIVATE streamcsv::streamcsv)
add_test(NAME test_cli COMMAND test_cli)
