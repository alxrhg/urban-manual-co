export async function uploadTripCover(formData: FormData) {
  const response = await fetch('/api/upload-trip-cover', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to upload trip cover');
  }

  return response.json();
}
