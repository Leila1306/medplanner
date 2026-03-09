# 🩺 MedPlanner

Planning de révisions intelligent pour étudiants en médecine.

## Déploiement sur Vercel (gratuit)

### 1. Prérequis
- Un compte GitHub : [github.com](https://github.com)
- Un compte Vercel : [vercel.com](https://vercel.com) (gratuit avec GitHub)
- Une clé API Anthropic : [console.anthropic.com](https://console.anthropic.com/settings/keys)

### 2. Étapes

1. **Crée un nouveau repo GitHub** :
   - Va sur github.com → "New repository"
   - Nom : `medplanner`
   - Upload tous les fichiers de ce dossier

2. **Déploie sur Vercel** :
   - Va sur [vercel.com/new](https://vercel.com/new)
   - Connecte ton GitHub
   - Sélectionne le repo `medplanner`
   - Clique "Deploy" — Vercel détecte automatiquement Vite
   - Attends ~1 minute

3. **Ton site est en ligne !** 🎉
   - Tu reçois une URL type `medplanner-xxx.vercel.app`
   - Ouvre-la sur ton téléphone ou PC

4. **Configure la clé API** :
   - Dans l'app, clique ⚙️ Paramètres
   - Colle ta clé API Anthropic (`sk-ant-...`)
   - Elle est stockée localement sur ton appareil

### 3. Ajouter sur l'écran d'accueil (iPhone/Android)

**iPhone** : Safari → bouton Partager → "Sur l'écran d'accueil"
**Android** : Chrome → menu ⋮ → "Ajouter à l'écran d'accueil"

## Fonctionnalités

- 📅 Calendrier mensuel/hebdomadaire avec planning auto
- 📄 Upload PDF avec analyse IA de la difficulté
- 🏋️ Suivi muscu Upper/Lower avec alternance
- 👟 Tracker 10k pas/jour
- ⏱️ Timer Pomodoro
- 📊 Dashboard avec stats et progression
- 🌙 Mode sombre
- 💾 Export/Import backup + Export .ics
- ⚖️ Rééquilibrage IA des difficultés
