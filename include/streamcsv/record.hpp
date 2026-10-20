#pragma once

#include <cstddef>
#include <initializer_list>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace streamcsv {

class Record {
public:
    Record() : line_number_(0) {}

    explicit Record(std::vector<std::string> fields, std::size_t line_number = 0)
        : fields_(std::move(fields)), line_number_(line_number) {}

    Record(std::initializer_list<std::string> fields, std::size_t line_number = 0)
        : fields_(fields), line_number_(line_number) {}

    [[nodiscard]] std::size_t line_number() const noexcept { return line_number_; }
    void set_line_number(std::size_t line) noexcept { line_number_ = line; }

    [[nodiscard]] const std::vector<std::string>& fields() const noexcept { return fields_; }
    [[nodiscard]] std::vector<std::string>& fields() noexcept { return fields_; }

    [[nodiscard]] std::size_t size() const noexcept { return fields_.size(); }
    [[nodiscard]] bool empty() const noexcept { return fields_.empty(); }

    [[nodiscard]] const std::string& operator[](std::size_t index) const {
        return fields_[index];
    }

    [[nodiscard]] std::string& operator[](std::size_t index) {
        return fields_[index];
    }

    [[nodiscard]] const std::string& at(std::size_t index) const {
        if (index >= fields_.size()) {
            throw std::out_of_range("Record index " + std::to_string(index) +
                                    " out of range (size: " + std::to_string(fields_.size()) + ")");
        }
        return fields_[index];
    }

    void add_field(std::string field) {
        fields_.push_back(std::move(field));
    }

    void reserve(std::size_t capacity) {
        fields_.reserve(capacity);
    }

    void clear() noexcept {
        fields_.clear();
        line_number_ = 0;
    }

    bool operator==(const Record& other) const noexcept {
        return fields_ == other.fields_ && line_number_ == other.line_number_;
    }

    bool operator!=(const Record& other) const noexcept {
        return !(*this == other);
    }

    auto begin() const noexcept { return fields_.begin(); }
    auto end() const noexcept { return fields_.end(); }
    auto begin() noexcept { return fields_.begin(); }
    auto end() noexcept { return fields_.end(); }
    auto cbegin() const noexcept { return fields_.cbegin(); }
    auto cend() const noexcept { return fields_.cend(); }

private:
    std::vector<std::string> fields_;
    std::size_t line_number_{0};
};

} // namespace streamcsv
