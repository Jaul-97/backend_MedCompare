const express = require('express');
const router = express.Router();
const dbPool = require('../db'); // Or '../config/db' if db.js is in a config folder

// Helper function to get connection, useful if you need transactions later
async function getConnection() {
    return dbPool.getConnection();
}

/**
 * GET /api/med-alt/query
 * Searches for medicines by name or ingredient and finds their alternatives.
 * Query param: searchTerm
 */
router.get('/query', async (req, res) => {
    const { searchTerm } = req.query;
    const primaryResultsLimit = 5; // Limit for initial search results
    const alternativesLimit = 5;   // Limit for alternatives per primary result

    if (!searchTerm || searchTerm.trim() === '') {
        return res.status(400).json({ message: 'Search term is required.' });
    }

    let connection;
    try {
        connection = await getConnection();

        // Step 1: Initial search for primary medicines.
        // We search in 'name' (brand) and 'salt_composition'.
        // is_discontinued = FALSE (or 0) ensures we only get current medicines.
        const primaryMedicinesSql = `
            SELECT 
                csv_id, name, manufacturer_name, price, pack_size_label, salt_composition, medicine_desc
            FROM 
                medicines_directory
            WHERE 
                (name LIKE ? OR MATCH(salt_composition) AGAINST (? IN NATURAL LANGUAGE MODE))
                AND is_discontinued = FALSE
            ORDER BY 
                CASE
                    WHEN name LIKE ? THEN 1  -- Prioritize direct name matches
                    ELSE 2
                END,
                name -- Further sort by name
            LIMIT ?;
        `;
        const searchTermLike = `%${searchTerm}%`;
        const [primaryResults] = await connection.query(primaryMedicinesSql, [searchTermLike, searchTerm, searchTermLike, primaryResultsLimit]);

        if (primaryResults.length === 0) {
            return res.json([]); // Return empty array if no primary matches, not 404, for better frontend handling
        }

        const searchResultsWithAlternatives = [];

        for (const med of primaryResults) {
            let alternatives = [];
            if (med.salt_composition && med.salt_composition.trim() !== '') {
                // Step 2: Find alternatives for the current primary medicine
                const alternativesSql = `
                    SELECT csv_id, name, manufacturer_name, price, pack_size_label
                    FROM medicines_directory
                    WHERE salt_composition = ?
                      AND csv_id != ? 
                      AND is_discontinued = FALSE
                    ORDER BY name
                    LIMIT ?;
                `;
                const [altResults] = await connection.query(alternativesSql, [med.salt_composition, med.csv_id, alternativesLimit]);
                alternatives = altResults.map(alt => ({
                    id: alt.csv_id,
                    brandName: alt.name,
                    manufacturer: alt.manufacturer_name,
                    price: parseFloat(alt.price) || null,
                    packSize: alt.pack_size_label
                }));
            }

            searchResultsWithAlternatives.push({
                id: med.csv_id,
                brandName: med.name,
                manufacturer: med.manufacturer_name,
                price: parseFloat(med.price) || null,
                packSize: med.pack_size_label,
                chemicalContent: med.salt_composition || "N/A",
                description: med.medicine_desc, // Added description
                // sideEffects: med.side_effects, // Optionally add if needed directly in search result
                // drugInteractions: med.drug_interactions, // Optionally add if needed (remember it's TEXT)
                alternatives: alternatives
            });
        }

        res.json(searchResultsWithAlternatives);

    } catch (error) {
        console.error('Error fetching medicine alternatives:', error);
        res.status(500).json({ message: 'Failed to fetch medicine data. Please try again later.' });
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
});

module.exports = router;