#include <streamcsv/csv.hpp>

#include <cstdint>
#include <iostream>
#include <sstream>
#include <string_view>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
    if (size == 0) return 0;

    std::string input(reinterpret_cast<const char*>(data), size);
    std::istringstream stream(input);

    streamcsv::ReaderConfig config;
    config.strict = (data[0] % 2 == 0);

    streamcsv::Reader reader(stream, config);

    try {
        while (auto record = reader.next_record()) {
            for (const auto& field : *record) {
                (void)field.size();
            }
        }
    } catch (const streamcsv::CsvError&) {
        // Expected behavior on malformed CSV inputs during fuzzing
    }

    return 0;
}

#ifndef LIBFUZZER_ACTIVE
// Standalone runner for testing the fuzzer harness without clang libFuzzer
int main() {
    std::cout << "StreamCSV Fuzz Target compiled successfully.\n";
    const uint8_t sample[] = "a,b,c\n\"d\",\"e\",f\n";
    LLVMFuzzerTestOneInput(sample, sizeof(sample) - 1);
    std::cout << "Harness self-test completed.\n";
    return 0;
}
#endif
