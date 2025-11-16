
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class ContentBasedModel:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.tfidf_matrix = None
        self.data = None

    def train(self, data: pd.DataFrame):
        self.data = data
        self.data['combined_features'] = self.data.apply(
            lambda row: ' '.join(row.get('tags', [])) + ' ' + row.get('category', '') + ' ' + row.get('description', ''),
            axis=1
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.data['combined_features'])

    def get_recommendations(self, destination_slugs: list[str], top_n: int = 10) -> list[dict]:
        if self.tfidf_matrix is None:
            return []

        indices = [self.data[self.data['slug'] == slug].index[0] for slug in destination_slugs if slug in self.data['slug'].values]
        if not indices:
            return []

        cosine_sim = cosine_similarity(self.tfidf_matrix[indices], self.tfidf_matrix)
        avg_cosine_sim = cosine_sim.mean(axis=0)
        sim_scores = list(enumerate(avg_cosine_sim))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = sim_scores[1:top_n+1]
        destination_indices = [i[0] for i in sim_scores]

        recommendations = []
        for i in destination_indices:
            recommendations.append({
                'destination_id': self.data['id'].iloc[i],
                'slug': self.data['slug'].iloc[i],
                'name': self.data['name'].iloc[i],
                'city': self.data['city'].iloc[i],
                'category': self.data['category'].iloc[i],
                'score': sim_scores[destination_indices.index(i)][1],
                'reason': 'Similar to your trip destinations'
            })
        return recommendations
