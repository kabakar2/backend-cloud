const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Connexion à la base de données
let db;

async function connectDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connexion à MySQL réussie');
    
    // Créer la table si elle n'existe pas
    await createTable();
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
  }
}

async function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS persons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  try {
    await db.execute(createTableQuery);
    console.log('Table "persons" créée ou vérifiée avec succès');
  } catch (error) {
    console.error('Erreur lors de la création de la table:', error);
  }
}

// Routes API

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API d\'inscription simple - Serveur fonctionnel!' });
});

// Récupérer tous les noms
app.get('/api/names', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM persons ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des noms:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un nouveau nom
app.post('/api/names', async (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }
  
  if (name.length > 100) {
    return res.status(400).json({ error: 'Le nom ne peut pas dépasser 100 caractères' });
  }
  
  try {
    const [result] = await db.execute(
      'INSERT INTO persons (name) VALUES (?)',
      [name.trim()]
    );
    
    res.status(201).json({ 
      message: 'Nom ajouté avec succès',
      id: result.insertId,
      name: name.trim()
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du nom:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour vérifier la santé de l'API
app.get('/api/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'OK', database: 'Connectée' });
  } catch (error) {
    res.status(500).json({ status: 'Erreur', database: 'Déconnectée' });
  }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`URL locale: http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
