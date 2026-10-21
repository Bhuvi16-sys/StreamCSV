#pragma once

#include <cctype>
#include <charconv>
#include <cstddef>
#include <initializer_list>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <type_traits>
#include <utility>
#include <vector>

namespace streamcsv {

namespace detail {

template <typename>
inline constexpr bool always_false_v = false;

inline std::string_view trim_sv(std::string_view sv) {
    while (!sv.empty() && (sv.front() == ' ' || sv.front() == '\t' || sv.front() == '\r' || sv.front() == '\n')) {
        sv.remove_prefix(1);
    }
    while (!sv.empty() && (sv.back() == ' ' || sv.back() == '\t' || sv.back() == '\r' || sv.back() == '\n')) {
        sv.remove_suffix(1);
    }
    return sv;
}

inline std::string to_lower_sv(std::string_view sv) {
    std::string res;
    res.reserve(sv.size());
    for (char c : sv) {
        res.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
    }
    return res;
}

template <typename T>
std::optional<T> try_convert(std::string_view raw_sv) {
    std::string_view sv = trim_sv(raw_sv);

    if constexpr (std::is_same_v<T, std::string>) {
        return std::string(raw_sv);
    } else if constexpr (std::is_same_v<T, std::string_view>) {
        return raw_sv;
    } else if constexpr (std::is_same_v<T, bool>) {
        std::string lower = to_lower_sv(sv);
        if (lower == "true" || lower == "1" || lower == "yes" || lower == "t") {
            return true;
        }
        if (lower == "false" || lower == "0" || lower == "no" || lower == "f") {
            return false;
        }
        return std::nullopt;
    } else if constexpr (std::is_integral_v<T>) {
        if (sv.empty()) return std::nullopt;
        if (sv.front() == '+') {
            sv.remove_prefix(1);
            if (sv.empty()) return std::nullopt;
        }
        T val{};
        const char* first = sv.data();
        const char* last = sv.data() + sv.size();
        auto [ptr, ec] = std::from_chars(first, last, val);
        if (ec == std::errc{} && ptr == last) {
            return val;
        }
        return std::nullopt;
    } else if constexpr (std::is_floating_point_v<T>) {
        if (sv.empty()) return std::nullopt;
        if (sv.front() == '+') {
            sv.remove_prefix(1);
            if (sv.empty()) return std::nullopt;
        }
        T val{};
        const char* first = sv.data();
        const char* last = sv.data() + sv.size();
        auto [ptr, ec] = std::from_chars(first, last, val);
        if (ec == std::errc{} && ptr == last) {
            return val;
        }
        return std::nullopt;
    } else {
        static_assert(always_false_v<T>, "StreamCSV Record::get<T>: Unsupported target conversion type.");
    }
}

} // namespace detail

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

    // Header mapping support
    void set_headers(std::shared_ptr<const std::vector<std::string>> headers) noexcept {
        headers_ = std::move(headers);
    }

    [[nodiscard]] bool has_headers() const noexcept {
        return headers_ != nullptr;
    }

    [[nodiscard]] const std::vector<std::string>& headers() const {
        if (!headers_) {
            throw std::logic_error("Record has no associated header row");
        }
        return *headers_;
    }

    [[nodiscard]] std::size_t get_column_index(const std::string& column_name) const {
        if (!headers_) {
            throw std::logic_error("Record has no associated header row");
        }
        for (std::size_t i = 0; i < headers_->size(); ++i) {
            if ((*headers_)[i] == column_name) {
                return i;
            }
        }
        throw std::out_of_range("Column '" + column_name + "' not found in headers");
    }

    [[nodiscard]] const std::string& operator[](const std::string& column_name) const {
        return at(get_column_index(column_name));
    }

    [[nodiscard]] const std::string& at(const std::string& column_name) const {
        return at(get_column_index(column_name));
    }

    // Typed conversion getters
    template <typename T>
    [[nodiscard]] T get(std::size_t index) const {
        const std::string& field_str = at(index);
        auto converted = detail::try_convert<T>(field_str);
        if (!converted) {
            throw std::invalid_argument("Failed to convert field at index " + std::to_string(index) +
                                        " ('" + field_str + "') to requested type");
        }
        return *converted;
    }

    template <typename T>
    [[nodiscard]] T get(const std::string& column_name) const {
        return get<T>(get_column_index(column_name));
    }

    template <typename T>
    [[nodiscard]] std::optional<T> get_optional(std::size_t index) const {
        if (index >= fields_.size()) {
            return std::nullopt;
        }
        const std::string& field_str = fields_[index];
        if (field_str.empty()) {
            return std::nullopt;
        }
        return detail::try_convert<T>(field_str);
    }

    template <typename T>
    [[nodiscard]] std::optional<T> get_optional(const std::string& column_name) const {
        if (!headers_) {
            return std::nullopt;
        }
        for (std::size_t i = 0; i < headers_->size(); ++i) {
            if ((*headers_)[i] == column_name) {
                return get_optional<T>(i);
            }
        }
        return std::nullopt;
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
    std::shared_ptr<const std::vector<std::string>> headers_{nullptr};
};

} // namespace streamcsv
