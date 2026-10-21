#include <streamcsv/csv.hpp>

#include <iostream>

int main() {
    std::cout << "Demonstrating StreamCSV Writer:\n\n";

    // Write CSV directly to std::cout
    streamcsv::WriterConfig config;
    config.newline = "\n"; // Unix style for console display
    streamcsv::Writer writer(std::cout, config);

    // 1. Write header row
    writer.write_record({"id", "name", "role", "score", "active", "notes"});

    // 2. Write rows using write_row variadic helper
    writer.write_row(1, "Alice", "Principal Engineer", 99.5, true, "Loves modern C++17");
    writer.write_row(2, "Bob", "Architect", 94.0, false, "Notes with, comma and \"quotes\"");
    writer.write_row(3, "Charlie", "Product Manager", 88.5, true, "Multiline\nnotes\nsupported");

    writer.flush();

    std::cout << "\nFinished writing " << writer.records_written() << " records.\n";
    return 0;
}
