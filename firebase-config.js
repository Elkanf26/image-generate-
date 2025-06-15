// Configuration Firebase pour votre générateur d'images IA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Votre configuration Firebase (remplacez par vos vraies clés)
const firebaseConfig = {
  apiKey: "AIzaSyCVcwNNPBM7YXZZv2tz2_5BdJUVZZZM8Bk",
  authDomain: "image-generator-ai-bb1a1.firebaseapp.com",
  projectId: "image-generator-ai-bb1a1",
  storageBucket: "image-generator-ai-bb1a1.firebasestorage.app",
  messagingSenderId: "447983340409",
  appId: "1:447983340409:web:2158447d1f770e1ad43da8"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Classe pour gérer les générations d'images
class FirebaseImageStorage {
    constructor() {
        this.db = db;
        this.collectionName = 'generations';
    }

    // Sauvegarder une nouvelle génération
    async saveGeneration(data) {
        try {
            const generationData = {
                email: data.email || '',
                prompt: data.prompt || '',
                dalle_url: data.dalle_url || null,
                dalle_status: data.dalle_status || 'error',
                sd_url: data.sd_url || null,
                sd_status: data.sd_status || 'error',
                mj_url: data.mj_url || null,
                mj_status: data.mj_status || 'error',
                total_time: data.total_time || 0,
                success_count: this.countSuccesses(data),
                created_at: new Date()
            };

            const docRef = await addDoc(collection(this.db, this.collectionName), generationData);
            console.log("✅ Document sauvegardé avec ID: ", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("❌ Erreur sauvegarde: ", error);
            return null;
        }
    }

    // Compter les succès
    countSuccesses(data) {
        let count = 0;
        if (data.dalle_status === 'success') count++;
        if (data.sd_status === 'success') count++;
        if (data.mj_status === 'success') count++;
        return count;
    }

    // Récupérer une génération par ID
    async getGenerationById(id) {
        try {
            const docRef = doc(this.db, this.collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.log("❌ Document introuvable");
                return null;
            }
        } catch (error) {
            console.error("❌ Erreur chargement: ", error);
            return null;
        }
    }

    // Récupérer les générations d'un utilisateur
    async getGenerationsByEmail(email) {
        try {
            const q = query(
                collection(this.db, this.collectionName), 
                where("email", "==", email),
                orderBy("created_at", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            const generations = [];
            
            querySnapshot.forEach((doc) => {
                generations.push({ id: doc.id, ...doc.data() });
            });
            
            return generations;
        } catch (error) {
            console.error("❌ Erreur chargement historique: ", error);
            return [];
        }
    }

    // Statistiques utilisateur
    async getUserStats(email) {
        try {
            const userGenerations = await this.getGenerationsByEmail(email);
            const totalImages = userGenerations.reduce((sum, gen) => sum + (gen.success_count || 0), 0);
            const totalPossible = userGenerations.length * 3;
            const successRate = totalPossible > 0 ? Math.round((totalImages / totalPossible) * 100) : 0;
            
            // IA préférée
            const aiStats = { dalle: 0, sd: 0, mj: 0 };
            userGenerations.forEach(gen => {
                if (gen.dalle_status === 'success') aiStats.dalle++;
                if (gen.sd_status === 'success') aiStats.sd++;
                if (gen.mj_status === 'success') aiStats.mj++;
            });
            
            const favoriteAI = Object.entries(aiStats).reduce((a, b) => 
                aiStats[a[0]] >= aiStats[b[0]] ? a : b
            )[0];

            return {
                totalGenerations: userGenerations.length,
                totalImages,
                successRate,
                favoriteAI: favoriteAI ? favoriteAI.toUpperCase() : 'DALL-E'
            };
        } catch (error) {
            console.error("❌ Erreur stats: ", error);
            return {
                totalGenerations: 0,
                totalImages: 0,
                successRate: 0,
                favoriteAI: 'DALL-E'
            };
        }
    }
}

// Créer l'instance globale
const firebaseStorage = new FirebaseImageStorage();

// Fonctions globales pour vos pages HTML
window.saveToFirebase = async function(data) {
    try {
        console.log('🔥 Sauvegarde dans Firebase...', data);
        const id = await firebaseStorage.saveGeneration(data);
        console.log('✅ Sauvegardé avec ID:', id);
        return id;
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
        return null;
    }
};

window.loadFromFirebase = async function(id) {
    try {
        console.log('🔥 Chargement depuis Firebase...', id);
        const data = await firebaseStorage.getGenerationById(id);
        console.log('✅ Données chargées:', data);
        return data;
    } catch (error) {
        console.error('❌ Erreur chargement:', error);
        return null;
    }
};

window.loadHistoryFromFirebase = async function(email) {
    try {
        console.log('🔥 Chargement historique...', email);
        const [generations, stats] = await Promise.all([
            firebaseStorage.getGenerationsByEmail(email),
            firebaseStorage.getUserStats(email)
        ]);
        console.log('✅ Historique chargé:', generations.length, 'générations');
        return { generations, stats };
    } catch (error) {
        console.error('❌ Erreur historique:', error);
        return { generations: [], stats: { totalGenerations: 0, totalImages: 0, successRate: 0, favoriteAI: 'DALL-E' } };
    }
};

// Confirmer que Firebase est prêt
window.firebaseReady = true;
console.log('🔥 Firebase configuré et prêt à l\'emploi !');
