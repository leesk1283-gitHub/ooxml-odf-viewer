/**
 * Critical files that should show warning when deleting
 */
export const CRITICAL_FILES = [
    '[Content_Types].xml',
    'document.xml',
    'workbook.xml',
    'presentation.xml',
    'content.xml',
    'styles.xml',
    'settings.xml',
    'app.xml',
    'core.xml'
] as const;

/**
 * Desktop minimum width threshold
 */
export const DESKTOP_MIN_WIDTH = 768;

/**
 * Sidebar width constraints
 */
export const SIDEBAR_WIDTH = {
    MIN: 150,
    MAX: 600
} as const;

/**
 * Animation duration for deletion
 */
export const DELETE_ANIMATION_DURATION = 300; // ms

/**
 * File extensions
 */
export const FILE_EXTENSIONS = {
    XML: ['.xml', '.rels', '.vml'],
    IMAGE: ['.png', '.jpg', '.jpeg', '.gif']
} as const;
