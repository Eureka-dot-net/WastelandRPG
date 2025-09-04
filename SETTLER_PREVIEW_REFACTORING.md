# SettlerPreviewCard Refactoring

This document describes the refactoring of the `SettlerPreviewCard` component to make it more flexible and extensible, along with the performance optimizations made to reduce API requests.

## Changes Made

### 1. SettlerPreviewCard Component Refactoring

**Before**: The component was tightly coupled to specific hooks:
- Called `usePreviewAssignment` and `usePreviewMapExploration` internally
- Used conditional logic to determine which hook to use
- Hard to extend with new event types

**After**: The component now accepts preview data as props:
- Added optional `preview`, `isLoading`, and `error` props
- Created unified `UnifiedPreview` interface supporting multiple event types
- Maintains backward compatibility with the old hook-based pattern
- Easy to plug in new event types

### 2. Unified Preview Interface

Created a flexible type system in `src/lib/types/preview.ts`:

```typescript
export type UnifiedPreview = AssignmentPreview | MapExplorationPreview;

export interface AssignmentPreview extends BasePreview {
  type: 'assignment';
  // Assignment-specific fields
}

export interface MapExplorationPreview extends BasePreview {
  type: 'exploration';  
  // Exploration-specific fields
}
```

### 3. API Improvements

#### Map Exploration API Fixed
- Changed from POST to GET to match assignment preview pattern
- Updated route: `GET /api/colonies/:colonyId/map/preview?x=...&y=...&settlerId=...`

#### New Batch APIs Added
- `GET /api/colonies/:colonyId/assignments/preview-batch?settlerIds=id1,id2&assignmentIds=aid1,aid2`
- `GET /api/colonies/:colonyId/map/preview-batch?settlerIds=id1,id2&coordinates=x1:y1,x2:y2`

### 4. Performance Optimizations

#### Assignment Page
**Before**: 
```
5 settlers × 10 assignments = 50 individual API requests
```

**After**: 
```
1 batch request for all 50 combinations
```

#### Map Page  
**Before**:
```
5 settlers × 8 explorable tiles = 40 individual API requests
```

**After**:
```
1 batch request for all 40 combinations  
```

## Usage Examples

### Traditional Usage (Backward Compatible)
```tsx
<SettlerPreviewCard
  settler={settler}
  assignment={assignment}
  colonyId="colony1"
/>
```

### New Preview Prop Usage
```tsx
const customPreview: UnifiedPreview = {
  type: 'exploration',
  settlerId: settler._id,
  settlerName: settler.name,
  duration: 600000,
  // ... other fields
};

<SettlerPreviewCard
  settler={settler}
  colonyId="colony1"
  preview={customPreview}
  isLoading={false}
  error={null}
/>
```

### Batch Hook Usage
```tsx
const { data: batchPreviews } = useBatchPreviewAssignment(
  colonyId,
  settlerIds,
  assignmentIds
);
```

## Benefits

1. **Extensibility**: Easy to add new event types without modifying the component
2. **Performance**: Dramatically reduced API requests through batching
3. **Flexibility**: Parent components can control preview data fetching
4. **Backward Compatibility**: Existing usage continues to work unchanged
5. **Type Safety**: Strong TypeScript types for all preview data

## Files Modified

### API
- `src/controllers/assignmentController.ts` - Added batch preview endpoint
- `src/controllers/mapController.ts` - Fixed GET endpoint, added batch preview
- `src/routes/assignment.ts` - Added batch route
- `src/routes/map.ts` - Updated to GET, added batch route

### Client
- `src/app/shared/components/settlers/SettlerPreviewCard.tsx` - Refactored component
- `src/lib/types/preview.ts` - New unified preview types
- `src/lib/utils/previewTransformers.ts` - Transform utilities
- `src/lib/hooks/usePreviewMapExploration.ts` - Updated to use GET
- `src/lib/hooks/useBatchPreviewAssignment.ts` - New batch hook
- `src/lib/hooks/useBatchPreviewMapExploration.ts` - New batch hook
- `src/features/Assignments/AssignmentPage.tsx` - Updated to use batch requests
- `src/features/map/MapPage.tsx` - Updated to use batch requests and GET API

## Migration Guide

No breaking changes - existing code will continue to work as before. To take advantage of the new features:

1. **For custom events**: Create preview data and pass to `preview` prop
2. **For batch operations**: Use the new batch hooks instead of multiple individual requests
3. **For new event types**: Extend the `UnifiedPreview` union type

See `src/examples/SettlerPreviewCardExample.tsx` for complete usage examples.