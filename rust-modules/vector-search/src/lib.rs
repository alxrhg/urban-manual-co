use pyo3::prelude::*;
use pyo3::exceptions::PyValueError;
use rayon::prelude::*;
use std::collections::HashMap;

/// A fast in-memory vector search index using brute-force search
/// Optimized with Rust's parallel processing
#[pyclass]
struct VectorIndex {
    vectors: Vec<Vec<f32>>,
    metadata: Vec<HashMap<String, String>>,
    dimension: usize,
}

#[pymethods]
impl VectorIndex {
    #[new]
    fn new(dimension: usize) -> Self {
        VectorIndex {
            vectors: Vec::new(),
            metadata: Vec::new(),
            dimension,
        }
    }

    /// Add a vector to the index with optional metadata
    fn add(&mut self, vector: Vec<f32>, metadata: Option<HashMap<String, String>>) -> PyResult<usize> {
        if vector.len() != self.dimension {
            return Err(PyValueError::new_err(format!(
                "Vector dimension mismatch. Expected {}, got {}",
                self.dimension,
                vector.len()
            )));
        }

        self.vectors.push(vector);
        self.metadata.push(metadata.unwrap_or_default());
        Ok(self.vectors.len() - 1)
    }

    /// Add multiple vectors in batch (much faster)
    fn add_batch(
        &mut self,
        vectors: Vec<Vec<f32>>,
        metadata: Option<Vec<HashMap<String, String>>>,
    ) -> PyResult<Vec<usize>> {
        let start_idx = self.vectors.len();
        let mut indices = Vec::new();

        for (i, vector) in vectors.iter().enumerate() {
            if vector.len() != self.dimension {
                return Err(PyValueError::new_err(format!(
                    "Vector {} has dimension mismatch. Expected {}, got {}",
                    i,
                    self.dimension,
                    vector.len()
                )));
            }
        }

        // All validated, now add them
        for (i, vector) in vectors.into_iter().enumerate() {
            self.vectors.push(vector);
            if let Some(ref meta) = metadata {
                if i < meta.len() {
                    self.metadata.push(meta[i].clone());
                } else {
                    self.metadata.push(HashMap::new());
                }
            } else {
                self.metadata.push(HashMap::new());
            }
            indices.push(start_idx + i);
        }

        Ok(indices)
    }

    /// Search for k nearest neighbors using cosine similarity
    /// Returns (indices, scores)
    fn search(&self, query: Vec<f32>, k: usize) -> PyResult<(Vec<usize>, Vec<f32>)> {
        if query.len() != self.dimension {
            return Err(PyValueError::new_err(format!(
                "Query dimension mismatch. Expected {}, got {}",
                self.dimension,
                query.len()
            )));
        }

        if self.vectors.is_empty() {
            return Ok((Vec::new(), Vec::new()));
        }

        let query_norm: f32 = query.iter().map(|x| x * x).sum::<f32>().sqrt();
        if query_norm == 0.0 {
            return Err(PyValueError::new_err("Query vector has zero norm"));
        }

        // Compute similarities in parallel
        let mut similarities: Vec<(usize, f32)> = self
            .vectors
            .par_iter()
            .enumerate()
            .map(|(idx, target)| {
                let dot_product: f32 = query.iter().zip(target.iter()).map(|(q, t)| q * t).sum();
                let target_norm: f32 = target.iter().map(|x| x * x).sum::<f32>().sqrt();

                let similarity = if target_norm == 0.0 {
                    0.0
                } else {
                    dot_product / (query_norm * target_norm)
                };

                (idx, similarity)
            })
            .collect();

        // Sort by similarity (descending)
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Take top-k
        let k = k.min(similarities.len());
        let indices: Vec<usize> = similarities[..k].iter().map(|(idx, _)| *idx).collect();
        let scores: Vec<f32> = similarities[..k].iter().map(|(_, score)| *score).collect();

        Ok((indices, scores))
    }

    /// Get metadata for a specific index
    fn get_metadata(&self, index: usize) -> PyResult<HashMap<String, String>> {
        if index >= self.metadata.len() {
            return Err(PyValueError::new_err("Index out of bounds"));
        }
        Ok(self.metadata[index].clone())
    }

    /// Get the number of vectors in the index
    fn size(&self) -> usize {
        self.vectors.len()
    }

    /// Clear all vectors and metadata
    fn clear(&mut self) {
        self.vectors.clear();
        self.metadata.clear();
    }

    /// Search with filters on metadata
    fn search_with_filter(
        &self,
        query: Vec<f32>,
        k: usize,
        filter_key: String,
        filter_value: String,
    ) -> PyResult<(Vec<usize>, Vec<f32>)> {
        if query.len() != self.dimension {
            return Err(PyValueError::new_err(format!(
                "Query dimension mismatch. Expected {}, got {}",
                self.dimension,
                query.len()
            )));
        }

        let query_norm: f32 = query.iter().map(|x| x * x).sum::<f32>().sqrt();
        if query_norm == 0.0 {
            return Err(PyValueError::new_err("Query vector has zero norm"));
        }

        // Filter and compute similarities in parallel
        let mut similarities: Vec<(usize, f32)> = self
            .vectors
            .par_iter()
            .enumerate()
            .filter_map(|(idx, target)| {
                // Check if metadata matches filter
                if let Some(meta_value) = self.metadata.get(idx).and_then(|m| m.get(&filter_key)) {
                    if meta_value != &filter_value {
                        return None;
                    }
                } else {
                    return None;
                }

                let dot_product: f32 = query.iter().zip(target.iter()).map(|(q, t)| q * t).sum();
                let target_norm: f32 = target.iter().map(|x| x * x).sum::<f32>().sqrt();

                let similarity = if target_norm == 0.0 {
                    0.0
                } else {
                    dot_product / (query_norm * target_norm)
                };

                Some((idx, similarity))
            })
            .collect();

        // Sort by similarity (descending)
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Take top-k
        let k = k.min(similarities.len());
        let indices: Vec<usize> = similarities[..k].iter().map(|(idx, _)| *idx).collect();
        let scores: Vec<f32> = similarities[..k].iter().map(|(_, score)| *score).collect();

        Ok((indices, scores))
    }
}

/// Brute force k-NN search across all vectors
/// Returns (indices, distances) for k nearest neighbors
#[pyfunction]
fn brute_force_knn(
    query: Vec<f32>,
    vectors: Vec<Vec<f32>>,
    k: usize,
) -> PyResult<(Vec<usize>, Vec<f32>)> {
    if vectors.is_empty() {
        return Ok((Vec::new(), Vec::new()));
    }

    let dimension = query.len();

    // Validate all vectors have same dimension
    for (i, vec) in vectors.iter().enumerate() {
        if vec.len() != dimension {
            return Err(PyValueError::new_err(format!(
                "Vector {} dimension mismatch",
                i
            )));
        }
    }

    // Compute distances in parallel
    let mut distances: Vec<(usize, f32)> = vectors
        .par_iter()
        .enumerate()
        .map(|(idx, target)| {
            let dist: f32 = query
                .iter()
                .zip(target.iter())
                .map(|(q, t)| (q - t).powi(2))
                .sum::<f32>()
                .sqrt();
            (idx, dist)
        })
        .collect();

    // Sort by distance (ascending)
    distances.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

    // Take top-k
    let k = k.min(distances.len());
    let indices: Vec<usize> = distances[..k].iter().map(|(idx, _)| *idx).collect();
    let dists: Vec<f32> = distances[..k].iter().map(|(_, dist)| *dist).collect();

    Ok((indices, dists))
}

/// Compute radius search - find all vectors within a distance threshold
#[pyfunction]
fn radius_search(
    query: Vec<f32>,
    vectors: Vec<Vec<f32>>,
    radius: f32,
) -> PyResult<(Vec<usize>, Vec<f32>)> {
    if vectors.is_empty() {
        return Ok((Vec::new(), Vec::new()));
    }

    let dimension = query.len();

    // Compute distances in parallel and filter by radius
    let results: Vec<(usize, f32)> = vectors
        .par_iter()
        .enumerate()
        .filter_map(|(idx, target)| {
            if target.len() != dimension {
                return None;
            }

            let dist: f32 = query
                .iter()
                .zip(target.iter())
                .map(|(q, t)| (q - t).powi(2))
                .sum::<f32>()
                .sqrt();

            if dist <= radius {
                Some((idx, dist))
            } else {
                None
            }
        })
        .collect();

    // Sort by distance
    let mut results = results;
    results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

    let indices: Vec<usize> = results.iter().map(|(idx, _)| *idx).collect();
    let distances: Vec<f32> = results.iter().map(|(_, dist)| *dist).collect();

    Ok((indices, distances))
}

/// Python module definition
#[pymodule]
fn vector_search(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<VectorIndex>()?;
    m.add_function(wrap_pyfunction!(brute_force_knn, m)?)?;
    m.add_function(wrap_pyfunction!(radius_search, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_index() {
        let mut index = VectorIndex::new(3);

        // Add vectors
        let _ = index.add(vec![1.0, 2.0, 3.0], None);
        let _ = index.add(vec![4.0, 5.0, 6.0], None);
        let _ = index.add(vec![7.0, 8.0, 9.0], None);

        assert_eq!(index.size(), 3);

        // Search
        let (indices, scores) = index.search(vec![1.0, 2.0, 3.0], 2).unwrap();
        assert_eq!(indices.len(), 2);
        assert!(scores[0] > 0.9); // First result should be very similar
    }

    #[test]
    fn test_brute_force_knn() {
        let query = vec![0.0, 0.0];
        let vectors = vec![
            vec![1.0, 0.0],
            vec![0.0, 1.0],
            vec![5.0, 5.0],
        ];

        let (indices, distances) = brute_force_knn(query, vectors, 2).unwrap();
        assert_eq!(indices.len(), 2);
        assert!(distances[0] < distances[1]); // Sorted by distance
    }
}
