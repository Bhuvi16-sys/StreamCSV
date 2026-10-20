#include <streamcsv/csv.hpp>

#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

int main(int argc, char* argv[]) {
    std::size_t target_records = 100000;
    if (argc > 1) {
        target_records = std::stoull(argv[1]);
    }

    std::cout << "Generating synthetic CSV dataset (" << target_records << " records)...\n";

    std::ostringstream dataset;
    dataset << "id,name,email,score,active,bio\n";
    for (std::size_t i = 1; i <= target_records; ++i) {
        dataset << i << ",User" << i << ",user" << i << "@example.com,"
                << (i * 1.5) << "," << (i % 2 == 0 ? "true" : "false")
                << ",\"Notes for user " << i << " with \"\"quoted\"\" text\"\n";
    }

    std::string csv_data = dataset.str();
    double data_size_mb = static_cast<double>(csv_data.size()) / (1024.0 * 1024.0);

    std::cout << "Dataset size: " << std::fixed << std::setprecision(2)
              << data_size_mb << " MB (" << csv_data.size() << " bytes)\n";
    std::cout << "Starting streaming parse benchmark...\n";

    std::istringstream stream(csv_data);
    streamcsv::Reader reader(stream);

    auto start_time = std::chrono::high_resolution_clock::now();
    std::size_t parsed_records = 0;
    std::size_t total_fields = 0;

    while (auto record = reader.next_record()) {
        ++parsed_records;
        total_fields += record->size();
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    auto elapsed_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(end_time - start_time).count();
    double elapsed_sec = static_cast<double>(elapsed_ns) / 1e9;

    double mb_per_sec = (data_size_mb) / elapsed_sec;
    double records_per_sec = static_cast<double>(parsed_records) / elapsed_sec;

    std::cout << "\n=== Benchmark Results ===\n";
    std::cout << "Records parsed:  " << parsed_records << " (fields: " << total_fields << ")\n";
    std::cout << "Elapsed time:    " << std::fixed << std::setprecision(4) << elapsed_sec << " s\n";
    std::cout << "Throughput:      " << std::fixed << std::setprecision(2) << mb_per_sec << " MB/s\n";
    std::cout << "Record rate:     " << std::fixed << std::setprecision(0) << records_per_sec << " records/s\n";

    return 0;
}
