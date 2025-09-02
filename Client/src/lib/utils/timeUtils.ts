/**
 * Comprehensive time/duration formatting utilities
 */

/**
 * Formats a duration in milliseconds into a human-readable string
 * 
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted duration string
 * 
 * Examples:
 * - formatDuration(30000) -> "30s" (30 seconds)
 * - formatDuration(90000) -> "1m 30s" (1 minute 30 seconds)
 * - formatDuration(3600000) -> "1h" (1 hour)
 * - formatDuration(86400000) -> "1d" (1 day)
 */
export function formatDuration(
  ms: number,
  options: {
    showSeconds?: boolean;
    compact?: boolean;
    maxUnits?: number;
  } = {}
): string {
  const {
    showSeconds = true,
    compact = false,
    maxUnits = 2
  } = options;

  if (ms < 0) return "0s";
  
  const totalSeconds = Math.ceil(ms / 1000);
  
  // Less than 1 minute - always show seconds
  if (totalSeconds < 60) {
    return compact ? `${totalSeconds}s` : `${totalSeconds}s`;
  }
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts: string[] = [];
  
  if (days > 0) parts.push(compact ? `${days}d` : `${days}d`);
  if (hours > 0) parts.push(compact ? `${hours}h` : `${hours}h`);
  if (minutes > 0) parts.push(compact ? `${minutes}m` : `${minutes}m`);
  
  // Only add seconds if requested and we have room for more units
  if (showSeconds && seconds > 0 && parts.length < maxUnits) {
    parts.push(compact ? `${seconds}s` : `${seconds}s`);
  }
  
  // If no parts were added (shouldn't happen with our logic), return 0s
  if (parts.length === 0) return "0s";
  
  // Limit to maxUnits
  return parts.slice(0, maxUnits).join(compact ? "" : " ");
}

/**
 * Formats remaining time for progress displays (mm:ss format for short durations)
 * This is used for active timers and progress indicators
 * 
 * @param ms - Time remaining in milliseconds
 * @returns Formatted time string (e.g., "1:23", "0:45")
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  
  const totalSeconds = Math.ceil(ms / 1000);
  
  // For durations over an hour, show hours too
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a task duration for display in UI elements like buttons and labels
 * Uses a context-appropriate format
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string optimized for UI display
 */
export function formatTaskDuration(ms: number): string {
  return formatDuration(ms, {
    showSeconds: true,
    compact: false,
    maxUnits: 2
  });
}