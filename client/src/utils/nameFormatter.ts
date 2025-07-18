/**
 * Utility function to standardize property names (ProjectName, BuilderName, etc.)
 * Converts text to title case: first letter capitalized, rest lowercase for each word
 */
export const formatPropertyName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Formats project name with proper title case
 */
export const formatProjectName = (projectName: string): string => {
  return formatPropertyName(projectName);
};

/**
 * Formats builder name with proper title case
 */
export const formatBuilderName = (builderName: string): string => {
  return formatPropertyName(builderName);
};

/**
 * Formats area/location name with proper title case
 */
export const formatAreaName = (areaName: string): string => {
  return formatPropertyName(areaName);
};