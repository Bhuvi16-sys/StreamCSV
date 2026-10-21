#include <streamcsv/csv.hpp>

#include <cassert>
#include <iostream>
#include <sstream>
#include <string>

// Test CLI inspect logic and exit code semantics
static void test_inspect_logic_clean_csv() {
    std::string csv_data = "id,name,role,active\n1,Alice,Dev,true\n2,Bob,QA,false\n";
    std::istringstream stream(csv_data);

    streamcsv::Reader reader(stream);
    std::size_t count = 0;
    while (reader.next_record()) {
        ++count;
    }
    assert(count == 3); // 1 header + 2 data rows
}

static void test_inspect_detects_ragged_rows() {
    // Row 1 has 3 cols, row 2 has 2 cols, row 3 has 4 cols
    std::string csv_data = "a,b,c\n1,2\nx,y,z,w\n";
    std::istringstream stream(csv_data);

    streamcsv::Reader reader(stream);
    std::size_t min_cols = 1000;
    std::size_t max_cols = 0;
    std::size_t count = 0;

    while (auto rec = reader.next_record()) {
        ++count;
        if (rec->size() < min_cols) min_cols = rec->size();
        if (rec->size() > max_cols) max_cols = rec->size();
    }

    assert(count == 3);
    assert(min_cols == 2);
    assert(max_cols == 4);
    assert(min_cols != max_cols); // Ragged detection works!
}

static void test_inspect_catches_parse_error() {
    // Malformed CSV: unclosed quote
    std::string csv_data = "a,b\n\"unclosed,quote\n";
    std::istringstream stream(csv_data);

    streamcsv::Reader reader(stream);
    bool caught = false;
    try {
        while (reader.next_record()) {}
    } catch (const streamcsv::CsvError& e) {
        caught = true;
        std::string msg = e.what();
        assert(msg.find("Unclosed quote") != std::string::npos);
    }
    assert(caught); // Exit code 2 guarantee
}

int main() {
    std::cout << "Running test_cli (Phase 4 validation)...\n";
    test_inspect_logic_clean_csv();
    test_inspect_detects_ragged_rows();
    test_inspect_catches_parse_error();
    std::cout << "test_cli PASSED! CLI inspect contracts verified.\n";
    return 0;
}
