import { describe, expect, it } from "vitest";
import { hashCupon, normalizarCupon } from "./cupones";

describe("cupones de acceso", () => {
  it("normaliza espacios y mayúsculas antes de validar", () => {
    expect(normalizarCupon("  MP-7KQ4-XN9C-2WFD  ")).toBe("mp-7kq4-xn9c-2wfd");
    expect(hashCupon(" MP-7KQ4-XN9C-2WFD ")).toBe(hashCupon("mp-7kq4-xn9c-2wfd"));
  });

  it("produce hashes distintos para códigos distintos", () => {
    expect(hashCupon("MP-7KQ4-XN9C-2WFD")).not.toBe(hashCupon("MP-C5GY-9LNE-4UBX"));
  });
});
