use pyo3::prelude::*;
use pyo3::exceptions::PyValueError;
use rayon::prelude::*;
use ndarray::{Array1, Array2, ArrayView1, ArrayView2};

/// Compute cosine similarity between two vectors
/// Much faster than Python/NumPy for batch operations
#[pyfunction]
fn cosine_similarity(vec_a: Vec<f32>, vec_b: Vec<f32>) -> PyResult<f32> {
    if vec_a.len() != vec_b.len() {
        return Err(PyValueError::new_err("Vectors must have the same length"));
    }

    let a = ArrayView1::from(&vec_a);
    let b = ArrayView1::from(&vec_b);

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return Ok(0.0);
    }

    Ok(dot_product / (norm_a * norm_b))
}

/// Compute cosine similarity between a query vector and multiple target vectors
/// Returns similarity scores for each target
///
/// This is highly optimized using Rust's parallel processing with Rayon
#[pyfunction]
fn batch_cosine_similarity(query: Vec<f32>, targets: Vec<Vec<f32>>) -> PyResult<Vec<f32>> {
    let query_arr = Array1::from_vec(query);
    let query_norm: f32 = query_arr.iter().map(|x| x * x).sum::<f32>().sqrt();

    if query_norm == 0.0 {
        return Err(PyValueError::new_err("Query vector has zero norm"));
    }

    // Use parallel processing for large batches
    let similarities: Vec<f32> = targets
        .par_iter()
        .map(|target| {
            let target_arr = ArrayView1::from(target);
            let dot_product: f32 = query_arr.iter().zip(target_arr.iter()).map(|(x, y)| x * y).sum();
            let target_norm: f32 = target_arr.iter().map(|x| x * x).sum::<f32>().sqrt();

            if target_norm == 0.0 {
                0.0
            } else {
                dot_product / (query_norm * target_norm)
            }
        })
        .collect();

    Ok(similarities)
}

/// Normalize a vector to unit length (L2 normalization)
#[pyfunction]
fn normalize_vector(vec: Vec<f32>) -> PyResult<Vec<f32>> {
    let arr = Array1::from_vec(vec);
    let norm: f32 = arr.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm == 0.0 {
        return Err(PyValueError::new_err("Cannot normalize zero vector"));
    }

    let normalized: Vec<f32> = arr.iter().map(|x| x / norm).collect();
    Ok(normalized)
}

/// Batch normalize multiple vectors in parallel
#[pyfunction]
fn batch_normalize(vectors: Vec<Vec<f32>>) -> PyResult<Vec<Vec<f32>>> {
    let normalized: Vec<Vec<f32>> = vectors
        .par_iter()
        .map(|vec| {
            let arr = Array1::from_vec(vec.clone());
            let norm: f32 = arr.iter().map(|x| x * x).sum::<f32>().sqrt();

            if norm == 0.0 {
                vec.clone() // Return original if zero
            } else {
                arr.iter().map(|x| x / norm).collect()
            }
        })
        .collect();

    Ok(normalized)
}

/// Compute pairwise distance matrix for a set of vectors
/// Uses parallel processing for efficiency
#[pyfunction]
fn pairwise_distances(vectors: Vec<Vec<f32>>) -> PyResult<Vec<Vec<f32>>> {
    let n = vectors.len();
    let mut distances = vec![vec![0.0; n]; n];

    // Compute upper triangle in parallel
    let pairs: Vec<(usize, usize, f32)> = (0..n)
        .into_par_iter()
        .flat_map(|i| {
            (i + 1..n)
                .into_par_iter()
                .map(move |j| {
                    let vec_i = &vectors[i];
                    let vec_j = &vectors[j];
                    let dist = euclidean_distance_internal(vec_i, vec_j);
                    (i, j, dist)
                })
        })
        .collect();

    // Fill the matrix
    for (i, j, dist) in pairs {
        distances[i][j] = dist;
        distances[j][i] = dist; // Symmetric
    }

    Ok(distances)
}

/// Internal function to compute Euclidean distance
fn euclidean_distance_internal(vec_a: &[f32], vec_b: &[f32]) -> f32 {
    vec_a
        .iter()
        .zip(vec_b.iter())
        .map(|(a, b)| (a - b).powi(2))
        .sum::<f32>()
        .sqrt()
}

/// Compute mean pooling of embeddings (useful for sentence embeddings)
#[pyfunction]
fn mean_pooling(embeddings: Vec<Vec<f32>>) -> PyResult<Vec<f32>> {
    if embeddings.is_empty() {
        return Err(PyValueError::new_err("Cannot compute mean of empty embeddings"));
    }

    let dim = embeddings[0].len();
    let n = embeddings.len() as f32;

    let mut mean = vec![0.0; dim];
    for embedding in embeddings {
        if embedding.len() != dim {
            return Err(PyValueError::new_err("All embeddings must have the same dimension"));
        }
        for (i, val) in embedding.iter().enumerate() {
            mean[i] += val;
        }
    }

    mean.iter_mut().for_each(|x| *x /= n);
    Ok(mean)
}

/// Find top-k most similar embeddings to a query
/// Returns indices and similarity scores
#[pyfunction]
fn top_k_similar(
    query: Vec<f32>,
    targets: Vec<Vec<f32>>,
    k: usize,
) -> PyResult<(Vec<usize>, Vec<f32>)> {
    let similarities = batch_cosine_similarity(query, targets)?;

    let mut indexed_scores: Vec<(usize, f32)> = similarities
        .iter()
        .enumerate()
        .map(|(i, &score)| (i, score))
        .collect();

    // Partial sort to get top-k
    indexed_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    indexed_scores.truncate(k.min(indexed_scores.len()));

    let indices: Vec<usize> = indexed_scores.iter().map(|(i, _)| *i).collect();
    let scores: Vec<f32> = indexed_scores.iter().map(|(_, s)| *s).collect();

    Ok((indices, scores))
}

/// Python module definition
#[pymodule]
fn embedding_processor(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(cosine_similarity, m)?)?;
    m.add_function(wrap_pyfunction!(batch_cosine_similarity, m)?)?;
    m.add_function(wrap_pyfunction!(normalize_vector, m)?)?;
    m.add_function(wrap_pyfunction!(batch_normalize, m)?)?;
    m.add_function(wrap_pyfunction!(pairwise_distances, m)?)?;
    m.add_function(wrap_pyfunction!(mean_pooling, m)?)?;
    m.add_function(wrap_pyfunction!(top_k_similar, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let result = cosine_similarity(a, b).unwrap();
        assert!(result > 0.97 && result < 0.98);
    }

    #[test]
    fn test_normalize_vector() {
        let vec = vec![3.0, 4.0];
        let normalized = normalize_vector(vec).unwrap();
        let norm: f32 = normalized.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_mean_pooling() {
        let embeddings = vec![
            vec![1.0, 2.0, 3.0],
            vec![4.0, 5.0, 6.0],
            vec![7.0, 8.0, 9.0],
        ];
        let mean = mean_pooling(embeddings).unwrap();
        assert_eq!(mean, vec![4.0, 5.0, 6.0]);
    }
}
