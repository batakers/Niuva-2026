import { describe, expect, it } from "vitest";
import { CAD_INSPECTION_PREFIX_BYTES, matchesCadContent, type CadFileExtension } from "@/modules/files/content-inspection";

const ascii = Buffer.from("\uFEFF  solid part\n  facet normal 0 -1.2 1e-3\nendsolid part\n");
function binary(triangles: number, header = "binary fixture") {
  const bytes = Buffer.alloc(84 + 50 * triangles);
  bytes.write(header); bytes.writeUInt32LE(triangles, 80);
  return bytes;
}
describe("bounded local CAD format inspection", () => {
  it.each([
    ["stl", ascii], ["stl", binary(1)], ["stl", binary(1, "solid binary")],
    ["obj", Buffer.from("\uFEFF # fixture\n\nv 0 -1.25 1e-3\nf 1 2 3\n")],
    ["step", Buffer.from("\uFEFF \nISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('test'),'2;1');")],
    ["stp", Buffer.from("ISO-10303-21; HEADER;")], ["3mf", Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  ] satisfies [CadFileExtension, Uint8Array][])("recognizes %s format headers", (extension, content) => {
    expect(matchesCadContent(extension, content, content.length)).toBe(true);
  });
  it.each([
    ["stl", Buffer.from("solid just a label")], ["stl", Buffer.from("solid part\nfacet normal x y z")],
    ["stl", binary(1).subarray(0, 100)], ["stl", binary(1).subarray(0, 83)],
    ["obj", Buffer.from("# v 0 0 0\nnot geometry")], ["obj", Buffer.from("v x y z")],
    ["obj", Buffer.from("v 0 0 0\u0000")], ["step", Buffer.from("ISO-10303-21; wrong;")],
    ["stp", Buffer.from("HEADER;")], ["3mf", Buffer.from("not ZIP")],
    ["stl", Buffer.from("<html>not STL</html>")], ["obj", Buffer.from([0xff, 0x0a, 0x76, 0x20, 0x30, 0x20, 0x30, 0x20, 0x30])],
  ] satisfies [CadFileExtension, Uint8Array][])("rejects incorrect %s content", (extension, content) => {
    expect(matchesCadContent(extension, content, content.length)).toBe(false);
  });
  it("rejects a triangle count inconsistent with actual object size", () => {
    const bytes = binary(1); bytes.writeUInt32LE(2, 80);
    expect(matchesCadContent("stl", bytes, bytes.length)).toBe(false);
  });
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid actual size %s", size => {
    expect(matchesCadContent("stl", ascii, size)).toBe(false);
  });
  it("checks binary STL using total size even when only its prefix is retained", () => {
    const bytes = binary(2000);
    expect(matchesCadContent("stl", bytes.subarray(0, CAD_INSPECTION_PREFIX_BYTES), bytes.length)).toBe(true);
  });
  it("rejects text whose identifiable header falls outside the bounded prefix", () => {
    const content = Buffer.from("#".repeat(CAD_INSPECTION_PREFIX_BYTES) + "\nv 0 0 0\n");
    expect(matchesCadContent("obj", content.subarray(0, CAD_INSPECTION_PREFIX_BYTES), content.length)).toBe(false);
  });
});
