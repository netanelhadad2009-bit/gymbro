/**
 * Tests for numeric4 utilities
 */

import { sanitizeNumeric4, normalizeOnBlur } from "../numeric4";

describe("sanitizeNumeric4", () => {
  it("should accept valid numeric input", () => {
    expect(sanitizeNumeric4("123")).toEqual({ text: "123", overflow: false });
    expect(sanitizeNumeric4("0")).toEqual({ text: "0", overflow: false });
    expect(sanitizeNumeric4("9999")).toEqual({ text: "9999", overflow: false });
  });

  it("should remove non-digit characters", () => {
    expect(sanitizeNumeric4("12a3")).toEqual({ text: "123", overflow: true });
    expect(sanitizeNumeric4("1-2-3")).toEqual({ text: "123", overflow: true });
    expect(sanitizeNumeric4("12.34")).toEqual({ text: "1234", overflow: true });
    expect(sanitizeNumeric4("  123  ")).toEqual({
      text: "123",
      overflow: true,
    });
  });

  it("should truncate to 4 digits", () => {
    expect(sanitizeNumeric4("12345")).toEqual({ text: "1234", overflow: true });
    expect(sanitizeNumeric4("999999")).toEqual({
      text: "9999",
      overflow: true,
    });
    expect(sanitizeNumeric4("00000")).toEqual({ text: "0000", overflow: true });
  });

  it("should handle paste with mixed content", () => {
    expect(sanitizeNumeric4("12,34")).toEqual({ text: "1234", overflow: true });
    expect(sanitizeNumeric4("  00123 kcal")).toEqual({
      text: "0012",
      overflow: true,
    });
    expect(sanitizeNumeric4("Calories: 250")).toEqual({
      text: "250",
      overflow: true,
    });
  });

  it("should handle empty and null input", () => {
    expect(sanitizeNumeric4("")).toEqual({ text: "", overflow: false });
    expect(sanitizeNumeric4(null as any)).toEqual({
      text: "",
      overflow: false,
    });
    expect(sanitizeNumeric4(undefined as any)).toEqual({
      text: "",
      overflow: false,
    });
  });

  it("should detect overflow when input has non-digits", () => {
    expect(sanitizeNumeric4("abc")).toEqual({ text: "", overflow: true });
    expect(sanitizeNumeric4("-123")).toEqual({ text: "123", overflow: true });
    expect(sanitizeNumeric4("1e3")).toEqual({ text: "13", overflow: true });
  });

  it("should handle scientific notation", () => {
    expect(sanitizeNumeric4("1e10")).toEqual({ text: "110", overflow: true });
    expect(sanitizeNumeric4("2.5e2")).toEqual({ text: "252", overflow: true });
  });

  it("should not flag overflow for 4 or fewer digits", () => {
    expect(sanitizeNumeric4("1")).toEqual({ text: "1", overflow: false });
    expect(sanitizeNumeric4("12")).toEqual({ text: "12", overflow: false });
    expect(sanitizeNumeric4("123")).toEqual({ text: "123", overflow: false });
    expect(sanitizeNumeric4("1234")).toEqual({ text: "1234", overflow: false });
  });
});

describe("normalizeOnBlur", () => {
  it("should remove leading zeros", () => {
    expect(normalizeOnBlur("0007")).toBe("7");
    expect(normalizeOnBlur("0123")).toBe("123");
    expect(normalizeOnBlur("00001")).toBe("1");
  });

  it("should preserve single zero", () => {
    expect(normalizeOnBlur("0")).toBe("0");
    expect(normalizeOnBlur("00")).toBe("0");
    expect(normalizeOnBlur("000")).toBe("0");
    expect(normalizeOnBlur("0000")).toBe("0");
  });

  it("should return empty string for empty input", () => {
    expect(normalizeOnBlur("")).toBe("");
  });

  it("should not modify already normalized values", () => {
    expect(normalizeOnBlur("1")).toBe("1");
    expect(normalizeOnBlur("123")).toBe("123");
    expect(normalizeOnBlur("9999")).toBe("9999");
  });

  it("should handle edge cases", () => {
    expect(normalizeOnBlur("0100")).toBe("100");
    expect(normalizeOnBlur("0001")).toBe("1");
  });
});
