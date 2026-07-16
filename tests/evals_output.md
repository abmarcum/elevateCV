# RAG Evaluation Results

| Metric | Baseline (Full Embedding Cosine) | Advanced (Chunk RAG + Cohere Reranking) |
| :--- | :---: | :---: |
| **Mean Absolute Error (MAE)** | 16.68 score points | **10.12** score points (lower is better) |
| **Precision@1 (Best Job Accuracy)** | 100% | **100%** (higher is better) |
| **Avg Processing Time per Pair** | 801 ms | 902 ms |


### Detailed Breakdown

| Resume | Job Posting | Human Ground Truth | Baseline Score | Advanced Score | Error Difference (Base / Adv) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Alice Dev | Senior React Developer (Next.js Focus) | 95 | 95 | 95 | 0 / 0 |
| Alice Dev | Technical Product Manager | 30 | 56 | 30 | 26 / 0 |
| Alice Dev | Machine Learning & Data Scientist | 15 | 44 | 10 | 29 / 5 |
| Alice Dev | Senior UX/UI Designer | 40 | 67 | 20 | 27 / 20 |
| Alice Dev | Growth Marketing Lead | 10 | 37 | 10 | 27 / 0 |
| Bob Product | Senior React Developer (Next.js Focus) | 20 | 54 | 10 | 34 / 10 |
| Bob Product | Technical Product Manager | 95 | 95 | 90 | 0 / 5 |
| Bob Product | Machine Learning & Data Scientist | 40 | 47 | 20 | 7 / 20 |
| Bob Product | Senior UX/UI Designer | 50 | 57 | 60 | 7 / 10 |
| Bob Product | Growth Marketing Lead | 35 | 60 | 20 | 25 / 15 |
| Charlie Data | Senior React Developer (Next.js Focus) | 15 | 42 | 10 | 27 / 5 |
| Charlie Data | Technical Product Manager | 45 | 50 | 50 | 5 / 5 |
| Charlie Data | Machine Learning & Data Scientist | 98 | 88 | 95 | 10 / 3 |
| Charlie Data | Senior UX/UI Designer | 20 | 29 | 10 | 9 / 10 |
| Charlie Data | Growth Marketing Lead | 25 | 39 | 10 | 14 / 15 |
| Diana Design | Senior React Developer (Next.js Focus) | 35 | 49 | 10 | 14 / 25 |
| Diana Design | Technical Product Manager | 50 | 52 | 25 | 2 / 25 |
| Diana Design | Machine Learning & Data Scientist | 10 | 35 | 0 | 25 / 10 |
| Diana Design | Senior UX/UI Designer | 95 | 95 | 90 | 0 / 5 |
| Diana Design | Growth Marketing Lead | 20 | 38 | 10 | 18 / 10 |
| Ethan Marketing | Senior React Developer (Next.js Focus) | 10 | 43 | 0 | 33 / 10 |
| Ethan Marketing | Technical Product Manager | 30 | 59 | 20 | 29 / 10 |
| Ethan Marketing | Machine Learning & Data Scientist | 20 | 41 | 0 | 21 / 20 |
| Ethan Marketing | Senior UX/UI Designer | 20 | 48 | 10 | 28 / 10 |
| Ethan Marketing | Growth Marketing Lead | 95 | 95 | 90 | 0 / 5 |


*Generated on: 2026-07-16T15:51:36.921Z*