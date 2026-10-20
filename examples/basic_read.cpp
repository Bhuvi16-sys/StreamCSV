#include <streamcsv/csv.hpp>

#include <iostream>
#include <sstream>

int main() {
    // Sample CSV with varied content: quotes, escaped quotes, numbers
    std::string sample = 
        "id,name,role,active\n"
        "1,Alice,\"Engineering Lead\",true\n"
        "2,Bob,\"Product \"\"Specialist\"\"\",false\n"
        "3,Charlie,Designer,true\n";

    std::istringstream stream(sample);
    streamcsv::Reader reader(stream);

    std::cout << "Reading CSV records with StreamCSV:\n\n";

    while (auto record = reader.next_record()) {
        std::cout << "Row " << record->line_number() << " [" << record->size() << " fields]:\n";
        for (std::size_t i = 0; i < record->size(); ++i) {
            std::cout << "  - [" << i << "] " << (*record)[i] << "\n";
        }
        std::cout << "\n";
    }

    return 0;
}
