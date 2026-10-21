#include <streamcsv/csv.hpp>

#include <cassert>
#include <iostream>
#include <sstream>
#include <string>

static void test_writer_basic() {
    std::ostringstream ss;
    streamcsv::WriterConfig config;
    config.newline = "\n"; // Unix newline for simple test assertions
    streamcsv::Writer writer(ss, config);

    writer.write_record({"id", "name", "role"});
    writer.write_record({"1", "Alice", "Engineer"});
    writer.write_record({"2", "Bob", "Designer"});

    std::string expected = 
        "id,name,role\n"
        "1,Alice,Engineer\n"
        "2,Bob,Designer\n";

    assert(ss.str() == expected);
    assert(writer.records_written() == 3);
}

static void test_writer_quoting_rfc4180() {
    std::ostringstream ss;
    streamcsv::WriterConfig config;
    config.newline = "\n";
    streamcsv::Writer writer(ss, config);

    // Test fields needing quotes: comma, quote, newline
    writer.write_record({"normal", "contains, comma", "contains \"quotes\"", "multi\nline"});

    std::string expected = 
        "normal,\"contains, comma\",\"contains \"\"quotes\"\"\",\"multi\nline\"\n";

    assert(ss.str() == expected);
}

static void test_writer_quote_styles() {
    // QuoteStyle::All
    {
        std::ostringstream ss;
        streamcsv::WriterConfig config;
        config.newline = "\n";
        config.quote_style = streamcsv::QuoteStyle::All;
        streamcsv::Writer writer(ss, config);

        writer.write_record({"1", "Alice", "Admin"});
        assert(ss.str() == "\"1\",\"Alice\",\"Admin\"\n");
    }

    // QuoteStyle::NonNumeric
    {
        std::ostringstream ss;
        streamcsv::WriterConfig config;
        config.newline = "\n";
        config.quote_style = streamcsv::QuoteStyle::NonNumeric;
        streamcsv::Writer writer(ss, config);

        writer.write_record({"100", "Alice", "3.1415", "Active"});
        assert(ss.str() == "100,\"Alice\",3.1415,\"Active\"\n");
    }

    // QuoteStyle::None
    {
        std::ostringstream ss;
        streamcsv::WriterConfig config;
        config.newline = "\n";
        config.quote_style = streamcsv::QuoteStyle::None;
        streamcsv::Writer writer(ss, config);

        writer.write_record({"a,b", "c\"d"});
        assert(ss.str() == "a,b,c\"d\n");
    }
}

static void test_writer_custom_delimiter() {
    std::ostringstream ss;
    streamcsv::WriterConfig config;
    config.delimiter = '\t';
    config.newline = "\n";
    streamcsv::Writer writer(ss, config);

    writer.write_record({"col1", "col2", "col3"});
    writer.write_record({"val1", "val with, comma", "val\twith tab"});

    std::string expected = 
        "col1\tcol2\tcol3\n"
        "val1\tval with, comma\t\"val\twith tab\"\n";

    assert(ss.str() == expected);
}

static void test_writer_variadic_row() {
    std::ostringstream ss;
    streamcsv::WriterConfig config;
    config.newline = "\n";
    streamcsv::Writer writer(ss, config);

    writer.write_row(1, "Alice", 98.75, true);
    writer.write_row(2, "Bob", 42.0, false);

    std::string expected = 
        "1,Alice,98.75,true\n"
        "2,Bob,42,false\n";

    assert(ss.str() == expected);
}

static void test_writer_to_string() {
    streamcsv::Record record({"42", "The answer, my friend", "true"});
    streamcsv::WriterConfig config;
    config.newline = "\n";

    std::string serialized = streamcsv::Writer::to_string(record, config);
    assert(serialized == "42,\"The answer, my friend\",true\n");
}

static void test_writer_round_trip() {
    std::ostringstream ss;
    streamcsv::Writer writer(ss);

    std::vector<streamcsv::Record> source_records = {
        streamcsv::Record({"id", "notes", "status"}),
        streamcsv::Record({"1", "Clean field", "OK"}),
        streamcsv::Record({"2", "Field with, delimiter and \"quotes\"", "PENDING"}),
        streamcsv::Record({"3", "Field with\r\nnewlines inside", "DONE"}),
        streamcsv::Record({"4", "", "EMPTY_FIELD"})
    };

    for (const auto& rec : source_records) {
        writer.write_record(rec);
    }

    std::string csv_output = ss.str();

    // Now read it back with Reader
    streamcsv::Reader reader(csv_output);
    std::vector<streamcsv::Record> parsed_records;

    while (auto rec = reader.next_record()) {
        parsed_records.push_back(std::move(*rec));
    }

    assert(parsed_records.size() == source_records.size());
    for (std::size_t i = 0; i < source_records.size(); ++i) {
        assert(parsed_records[i].size() == source_records[i].size());
        for (std::size_t f = 0; f < source_records[i].size(); ++f) {
            assert(parsed_records[i][f] == source_records[i][f]);
        }
    }
}

int main() {
    std::cout << "Running test_writer...\n";
    test_writer_basic();
    test_writer_quoting_rfc4180();
    test_writer_quote_styles();
    test_writer_custom_delimiter();
    test_writer_variadic_row();
    test_writer_to_string();
    test_writer_round_trip();
    std::cout << "test_writer PASSED!\n";
    return 0;
}
