import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from './locales/en/common.json'
import enLevels from './locales/en/levels.json'
import enSidebar from './locales/en/components/sidebar.json'
import enIntroduction from './locales/en/pages/introduction.json'
import enAiConfigModal from './locales/en/components/aiConfigModal.json'
import enConfigAI from './locales/en/pages/configAI.json'
import enDonate from './locales/en/features/donate.json'
import enGallery from './locales/en/pages/gallery.json'
import enAppDraw from './locales/en/pages/appDraw.json'
import enAppLogin from './locales/en/pages/appLogin.json'
import enLevelSet from './locales/en/pages/levelSet.json'
import enLevelSetGuess from './locales/en/pages/levelSetGuess.json'
import enChallengeDraw from './locales/en/pages/challengeDraw.json'
import enChallengeGuess from './locales/en/pages/challengeGuess.json'
// Add more imports as needed...

import zhCommon from './locales/zh-CN/common.json'
import zhLevels from './locales/zh-CN/levels.json'
import zhSidebar from './locales/zh-CN/components/sidebar.json'
import zhIntroduction from './locales/zh-CN/pages/introduction.json'
import zhAiConfigModal from './locales/zh-CN/components/aiConfigModal.json'
import zhConfigAI from './locales/zh-CN/pages/configAI.json'
import zhDonate from './locales/zh-CN/features/donate.json'
import zhGallery from './locales/zh-CN/pages/gallery.json'
import zhAppDraw from './locales/zh-CN/pages/appDraw.json'
import zhAppLogin from './locales/zh-CN/pages/appLogin.json'
import zhLevelSet from './locales/zh-CN/pages/levelSet.json'
import zhLevelSetGuess from './locales/zh-CN/pages/levelSetGuess.json'
import zhChallengeDraw from './locales/zh-CN/pages/challengeDraw.json'
import zhChallengeGuess from './locales/zh-CN/pages/challengeGuess.json'
// Add more imports as needed...

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        levels: enLevels,
        sidebar: enSidebar,
        introduction: enIntroduction,
        aiConfigModal: enAiConfigModal,
        configAI: enConfigAI,
        donate: enDonate,
        gallery: enGallery,
        appDraw: enAppDraw,
        appLogin: enAppLogin,
        levelSet: enLevelSet,
        levelSetGuess: enLevelSetGuess,
        challengeDraw: enChallengeDraw,
        challengeGuess: enChallengeGuess,
        // Add more namespaces as needed...
      },
      'zh-CN': {
        common: zhCommon,
        levels: zhLevels,
        sidebar: zhSidebar,
        introduction: zhIntroduction,
        aiConfigModal: zhAiConfigModal,
        configAI: zhConfigAI,
        donate: zhDonate,
        gallery: zhGallery,
        appDraw: zhAppDraw,
        appLogin: zhAppLogin,
        levelSet: zhLevelSet,
        levelSetGuess: zhLevelSetGuess,
        challengeDraw: zhChallengeDraw,
        challengeGuess: zhChallengeGuess,
        // Add more namespaces as needed...
      },
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true, // Allow returning objects/arrays from t()
    returnNull: false, // don't return null for missing keys
    returnEmptyString: false, // don't return empty string for missing keys

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    defaultNS: 'common', // Set default namespace
  })

export default i18n
