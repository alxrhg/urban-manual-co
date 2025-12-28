## 2024-05-23 - Image Uploads MUST Use Magic Byte Validation

**Vulnerability:** The `/api/upload-trip-cover` and `/api/upload-image` endpoints relied on client-provided `Content-Type` headers and file extensions for validation. This allowed attackers to upload malicious files (e.g., scripts) disguised as images by simply renaming them or spoofing the MIME type.
**Learning:** Never trust client-provided file metadata. `file.type` and `file.name` are user-controlled.
**Prevention:**
1.  **Validate:** Always use `validateImageFile` (magic byte detection) from `@/lib/security/image-validation`.
2.  **Sanitize:** Use `getSafeExtension` to generate the file extension based on the *detected* content, not the user's filename.
3.  **Reject:** Fail closed if the file content doesn't match the allowed signatures.
