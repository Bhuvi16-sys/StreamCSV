#include <streamcsv/csv.hpp>

#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

int main(int argc, char* argv[]) {
    std::size_t target_records = 100000;
    if (argc > 1) {
        target_records = std::stoull(argv[1]);
    }

    std::cout << "=========================================================\n"
              << "       StreamCSV Performance Benchmark Suite            \n"
              << "=========================================================\n"
              << "Dataset Target: " << target_records << " records\n\n";

    // 1. Generate Synthetic Dataset in Memory
    std::cout << "[1/3] Generating synthetic CSV workload...\n";
    std::ostringstream dataset;
    dataset << "id,name,email,score,active,bio\n";
    for (std::size_t i = 1; i <= target_records; ++i) {
        dataset << i << ",User" << i << ",user" << i << "@example.com,"
                << (i * 1.5) << "," << (i % 2 == 0 ? "true" : "false")
                << ",\"Notes for user " << i << " with \"\"quoted\"\" text\"\n";
    }

    std::string csv_data = dataset.str();
    double data_size_mb = static_cast<double>(csv_data.size()) / (1024.0 * 1024.0);

    std::cout << "Workload Size:  " << std::fixed << std::setprecision(2)
              << data_size_mb << " MB (" << csv_data.size() << " bytes)\n\n";

    // 2. Benchmark Streaming Reader
    std::cout << "[2/3] Benchmarking Streaming Reader (Parsing)...\n";
    std::istringstream stream(csv_data);
    streamcsv::Reader reader(stream);

    std::vector<streamcsv::Record> sampled_records;
    sampled_records.reserve(1000);

    auto start_read = std::chrono::high_resolution_clock::now();
    std::size_t parsed_records = 0;
    std::size_t total_fields = 0;

    while (auto record = reader.next_record()) {
        ++parsed_records;
        total_fields += record->size();
        if (sampled_records.size() < 1000) {
            sampled_records.push_back(*record);
        }
    }

    auto end_read = std::chrono::high_resolution_clock::now();
    double elapsed_read_sec = std::chrono::duration<double>(end_read - start_read).count();
    double read_mb_per_sec = data_size_mb / elapsed_read_sec;
    double read_records_per_sec = static_cast<double>(parsed_records) / elapsed_read_sec;

    // 3. Benchmark Schema Validation
    std::cout << "[3/3] Benchmarking Schema Validator...\n";
    streamcsv::Schema schema({
        {"id", streamcsv::ColumnType::Integer, true},
        {"name", streamcsv::ColumnType::String, true},
        {"email", streamcsv::ColumnType::String, true},
        {"score", streamcsv::ColumnType::Float, true},
        {"active", streamcsv::ColumnType::Boolean, true},
        {"bio", streamcsv::ColumnType::String, false}
    });
    streamcsv::Validator validator(schema);

    auto start_val = std::chrono::high_resolution_clock::now();
    std::size_t valid_count = 0;
    // Validate sampled records repeatedly to equal total workload size
    std::size_t val_iterations = parsed_records / (sampled_records.empty() ? 1 : sampled_records.size());
    for (std::size_t it = 0; it < val_iterations; ++it) {
        for (const auto& rec : sampled_records) {
            if (validator.is_valid(rec)) {
                ++valid_count;
            }
        }
    }
    auto end_val = std::chrono::high_resolution_clock::now();
    double elapsed_val_sec = std::chrono::duration<double>(end_val - start_val).count();
    double val_records_per_sec = static_cast<double>(valid_count) / elapsed_val_sec;

    // 4. Benchmark Streaming Writer
    std::ostringstream out_sink;
    streamcsv::Writer writer(out_sink);
    auto start_write = std::chrono::high_resolution_clock::now();
    for (std::size_t it = 0; it < val_iterations; ++it) {
        for (const auto& rec : sampled_records) {
            writer.write_record(rec);
        }
    }
    auto end_write = std::chrono::high_resolution_clock::now();
    double elapsed_write_sec = std::chrono::duration<double>(end_write - start_write).count();
    double written_mb = static_cast<double>(out_sink.str().size()) / (1024.0 * 1024.0);
    double write_mb_per_sec = written_mb / elapsed_write_sec;
    double write_records_per_sec = static_cast<double>(valid_count) / elapsed_write_sec;

    std::cout << "\n=========================================================\n"
              << "                   BENCHMARK RESULTS                     \n"
              << "=========================================================\n";
    std::cout << "1. STREAMING READER:\n"
              << "   - Records Processed: " << parsed_records << "\n"
              << "   - Elapsed Time:      " << std::fixed << std::setprecision(4) << elapsed_read_sec << " s\n"
              << "   - Throughput:        " << std::fixed << std::setprecision(2) << read_mb_per_sec << " MB/s\n"
              << "   - Record Rate:       " << std::fixed << std::setprecision(0) << read_records_per_sec << " records/s\n\n";

    std::cout << "2. SCHEMA VALIDATOR:\n"
              << "   - Records Validated: " << valid_count << "\n"
              << "   - Elapsed Time:      " << std::fixed << std::setprecision(4) << elapsed_val_sec << " s\n"
              << "   - Validation Rate:   " << std::fixed << std::setprecision(0) << val_records_per_sec << " records/s\n\n";

    std::cout << "3. STREAMING WRITER:\n"
              << "   - Output Size:       " << std::fixed << std::setprecision(2) << written_mb << " MB\n"
              << "   - Elapsed Time:      " << std::fixed << std::setprecision(4) << elapsed_write_sec << " s\n"
              << "   - Throughput:        " << std::fixed << std::setprecision(2) << write_mb_per_sec << " MB/s\n"
              << "   - Generation Rate:   " << std::fixed << std::setprecision(0) << write_records_per_sec << " records/s\n";
    std::cout << "=========================================================\n";

    return 0;
}
