#include <streamcsv/csv.hpp>

#include <algorithm>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

namespace {

void print_usage(const char* prog) {
    std::cout << "StreamCSV CLI v0.1.0\n"
              << "A bounded-memory streaming CSV parser, inspector, and validator\n\n"
              << "Usage:\n"
              << "  " << prog << " inspect <file.csv | -> [options]\n"
              << "  " << prog << " validate <file.csv | -> [col_type1 col_type2 ...]\n\n"
              << "Commands:\n"
              << "  inspect    Analyze CSV dimensions, record counts, and inspect preview rows\n"
              << "  validate   Validate record schemas against types (string, int, float, bool)\n\n"
              << "Options for 'inspect':\n"
              << "  -n, --preview <N>     Number of preview rows to display (default: 5)\n"
              << "  -d, --delimiter <C>   Field delimiter character (default: ',')\n"
              << "  --header              First record is treated as column header\n\n"
              << "Exit Codes:\n"
              << "  0: Success (operation completed, all records valid)\n"
              << "  1: Validation issues detected\n"
              << "  2: Parse error, resource limit exceeded, or I/O failure\n";
}

streamcsv::ColumnType parse_type(const std::string& str) {
    if (str == "int" || str == "integer") return streamcsv::ColumnType::Integer;
    if (str == "float" || str == "double") return streamcsv::ColumnType::Float;
    if (str == "bool" || str == "boolean") return streamcsv::ColumnType::Boolean;
    return streamcsv::ColumnType::String;
}

int do_inspect(std::istream& is, const std::string& name, std::size_t max_preview, char delimiter, bool has_header) {
    streamcsv::ReaderConfig config;
    config.delimiter = delimiter;
    config.has_header = has_header;

    streamcsv::Reader reader(is, config);
    std::size_t count = 0;
    std::size_t max_cols = 0;
    std::size_t min_cols = 0;
    std::vector<streamcsv::Record> preview;

    try {
        while (auto record = reader.next_record()) {
            ++count;
            if (count == 1) {
                min_cols = record->size();
                max_cols = record->size();
            } else {
                if (record->size() < min_cols) min_cols = record->size();
                if (record->size() > max_cols) max_cols = record->size();
            }

            if (preview.size() < max_preview) {
                preview.push_back(std::move(*record));
            }
        }
    } catch (const streamcsv::CsvError& e) {
        std::cerr << "[ERROR] " << e.what() << "\n";
        return 2;
    } catch (const std::exception& e) {
        std::cerr << "[ERROR] Failed during inspect: " << e.what() << "\n";
        return 2;
    }

    std::cout << "=== StreamCSV Inspect: " << name << " ===\n";
    std::cout << "Total Records: " << count << "\n";
    if (reader.has_header() && !reader.header().empty()) {
        std::cout << "Header (" << reader.header().size() << " columns): [";
        for (std::size_t i = 0; i < reader.header().size(); ++i) {
            std::cout << reader.header()[i] << (i + 1 < reader.header().size() ? ", " : "");
        }
        std::cout << "]\n";
    }

    if (count > 0) {
        std::cout << "Columns:       " << min_cols;
        if (min_cols != max_cols) {
            std::cout << " to " << max_cols << " (WARNING: non-uniform row lengths detected)";
        }
        std::cout << "\n\n";

        if (max_preview > 0 && !preview.empty()) {
            std::cout << "Preview (first " << preview.size() << " data records):\n";
            for (std::size_t r = 0; r < preview.size(); ++r) {
                std::cout << "  Row " << std::setw(3) << preview[r].line_number() << " │ ";
                for (std::size_t c = 0; c < preview[r].size(); ++c) {
                    std::cout << preview[r][c] << (c + 1 < preview[r].size() ? " │ " : "");
                }
                std::cout << "\n";
            }
        }
    } else {
        std::cout << "File is empty.\n";
    }

    return 0;
}

int do_validate(std::istream& is, const std::vector<std::string>& type_args) {
    streamcsv::Reader reader(is);
    std::size_t row = 0;
    std::size_t issue_count = 0;

    std::unique_ptr<streamcsv::Validator> validator;

    try {
        while (auto record = reader.next_record()) {
            ++row;

            if (row == 1 && !type_args.empty()) {
                std::vector<streamcsv::Column> cols;
                for (std::size_t i = 0; i < type_args.size(); ++i) {
                    std::string col_name = (i < record->size()) ? (*record)[i] : ("col" + std::to_string(i + 1));
                    cols.emplace_back(col_name, parse_type(type_args[i]), true);
                }
                validator = std::make_unique<streamcsv::Validator>(streamcsv::Schema(std::move(cols)));
                // Header row consumed
                continue;
            }

            if (validator) {
                auto issues = validator->validate_record(*record);
                for (const auto& issue : issues) {
                    ++issue_count;
                    std::cerr << issue.to_string() << "\n";
                }
            }
        }
    } catch (const streamcsv::CsvError& e) {
        std::cerr << "[ERROR] " << e.what() << "\n";
        return 2;
    } catch (const std::exception& e) {
        std::cerr << "[ERROR] " << e.what() << "\n";
        return 2;
    }

    if (issue_count > 0) {
        std::cerr << "Validation failed: " << issue_count << " issue(s) detected.\n";
        return 1;
    }

    std::cout << "Validation successful: " << row << " record(s) processed with 0 issues.\n";
    return 0;
}

} // namespace

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage("streamcsv");
        return 0;
    }

    std::string cmd = argv[1];
    if (cmd == "--help" || cmd == "-h" || cmd == "help") {
        print_usage(argv[0]);
        return 0;
    }

    if (cmd != "inspect" && cmd != "validate") {
        std::cerr << "Unknown command: " << cmd << "\n";
        print_usage(argv[0]);
        return 2;
    }

    std::string filename = (argc >= 3) ? argv[2] : "-";
    std::size_t preview_count = 5;
    char delimiter = ',';
    bool has_header = false;
    std::vector<std::string> remaining_args;

    // Parse options starting from index 3
    for (int i = 3; i < argc; ++i) {
        std::string arg = argv[i];
        if ((arg == "-n" || arg == "--preview") && i + 1 < argc) {
            preview_count = std::stoull(argv[++i]);
        } else if ((arg == "-d" || arg == "--delimiter") && i + 1 < argc) {
            std::string d_str = argv[++i];
            delimiter = d_str.empty() ? ',' : d_str[0];
        } else if (arg == "--header") {
            has_header = true;
        } else {
            remaining_args.push_back(arg);
        }
    }

    std::unique_ptr<std::ifstream> file_stream;
    std::istream* input = &std::cin;

    if (filename != "-") {
        file_stream = std::make_unique<std::ifstream>(filename, std::ios::binary);
        if (!file_stream->is_open()) {
            std::cerr << "Error: Could not open file '" << filename << "'\n";
            return 2;
        }
        input = file_stream.get();
    }

    if (cmd == "inspect") {
        return do_inspect(*input, filename, preview_count, delimiter, has_header);
    }

    return do_validate(*input, remaining_args);
}
