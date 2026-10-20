add_executable(test_reader test_reader.cpp)
target_link_libraries(test_reader PRIVATE streamcsv::streamcsv)
add_test(NAME test_reader COMMAND test_reader)

add_executable(test_errors test_errors.cpp)
target_link_libraries(test_errors PRIVATE streamcsv::streamcsv)
add_test(NAME test_errors COMMAND test_errors)

add_executable(test_schema test_schema.cpp)
target_link_libraries(test_schema PRIVATE streamcsv::streamcsv)
add_test(NAME test_schema COMMAND test_schema)
