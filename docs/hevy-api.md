# Hevy API Reference

> Base URL: `https://api.hevyapp.com`
> Version: v1 (0.0.1)
> Hevy Pro required

Welcome to Hevy's public API. This API is only available to Hevy Pro users. Get your API key at https://hevy.com/settings?developer. Contact: pedro@hevyapp.com.

**Note:** Hevy makes no guarantees about stability -- the API structure may change or be discontinued at any time.

---

## Authentication

All endpoints require the `api-key` header:

```
api-key: <your-uuid-api-key>
```

---

## Pagination

Most list endpoints use page-based pagination with these query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (must be >= 1) |
| `pageSize` | integer | `5` | Items per page (max varies by endpoint) |

Paginated responses include:
- `page` (integer) -- current page number
- `page_count` (integer) -- total number of pages

---

## Endpoints

### Workouts

#### GET /v1/workouts

Get a paginated list of workouts.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (>= 1) |
| `pageSize` | integer | `5` | Items per page (max 10) |

**Response 200:**

```json
{
  "page": 1,
  "page_count": 5,
  "workouts": [Workout]
}
```

**Response 400:** Invalid page size.

---

#### POST /v1/workouts

Create a new workout.

**Request Body:**

```json
{
  "workout": {
    "title": "Friday Leg Day",
    "description": "Medium intensity leg day focusing on quads.",
    "start_time": "2024-08-14T12:00:00Z",
    "end_time": "2024-08-14T12:30:00Z",
    "is_private": false,
    "exercises": [
      {
        "exercise_template_id": "D04AC939",
        "superset_id": null,
        "notes": "Felt good today. Form was on point.",
        "sets": [
          {
            "type": "normal",
            "weight_kg": 100,
            "reps": 10,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null,
            "rpe": 8.5
          }
        ]
      }
    ]
  }
}
```

**Request body `workout` fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `title` | string | no | The title of the workout |
| `description` | string | yes | A description for the workout |
| `start_time` | string (ISO 8601) | no | When the workout started |
| `end_time` | string (ISO 8601) | no | When the workout ended |
| `is_private` | boolean | no | Whether the workout is private |
| `exercises` | array of Exercise Input | no | List of exercises in the workout |

**Exercise Input fields:**

| Field | Type | Description |
|-------|------|-------------|
| `exercise_template_id` | string | The ID of the exercise template (e.g. `"D04AC939"`) |
| `superset_id` | integer or null | Superset grouping ID. Exercises with the same superset_id are grouped |
| `notes` | string | Additional notes for the exercise |
| `sets` | array of Set Input | List of sets for the exercise |

**Set Input fields (for workouts):**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | One of: `warmup`, `normal`, `failure`, `dropset` |
| `weight_kg` | number | Weight in kilograms |
| `reps` | integer | Number of repetitions |
| `distance_meters` | integer | Distance in meters |
| `duration_seconds` | integer | Duration in seconds |
| `custom_metric` | number | Custom metric (used for steps/floors on stair machines) |
| `rpe` | number | Rating of Perceived Exertion. Values: `6`, `7`, `7.5`, `8`, `8.5`, `9`, `9.5`, `10` |

**Response 201:** Returns the created [Workout](#workout-object).

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

---

#### GET /v1/workouts/count

Get the total number of workouts on the account.

**Response 200:**

```json
{
  "workout_count": 42
}
```

---

#### GET /v1/workouts/events

Retrieve a paged list of workout events (updates or deletes) since a given date. Events are ordered newest to oldest. Designed for keeping a local cache in sync without fetching all workouts.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (>= 1) |
| `pageSize` | integer | `5` | Items per page (max 10) |
| `since` | string (ISO 8601) | `1970-01-01T00:00:00Z` | Only return events after this date |

**Response 200:**

```json
{
  "page": 1,
  "page_count": 5,
  "events": [
    {
      "type": "updated",
      "workout": { ...Workout object... }
    },
    {
      "type": "deleted",
      "id": "efe6801c-4aee-4959-bcdd-fca3f272821b",
      "deleted_at": "2021-09-13T12:00:00Z"
    }
  ]
}
```

Each event in the `events` array is one of two types:

**Updated event:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"updated"` |
| `workout` | Workout | The full updated [Workout](#workout-object) |

**Deleted event:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"deleted"` |
| `id` | string | UUID of the deleted workout |
| `deleted_at` | string (ISO 8601) | When the workout was deleted |

**Response 500:** Internal Server Error.

---

#### GET /v1/workouts/{workoutId}

Get a single workout's complete details.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workoutId` | string | yes | The workout UUID |

**Response 200:** Returns a [Workout](#workout-object).

**Response 404:** Workout not found.

---

#### PUT /v1/workouts/{workoutId}

Update an existing workout. Request body is identical to POST /v1/workouts.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workoutId` | string | yes | The workout UUID |

**Request Body:** Same as [POST /v1/workouts](#post-v1workouts).

**Response 200:** Returns the updated [Workout](#workout-object).

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

---

### Users

#### GET /v1/user/info

Get the authenticated user's info.

**Response 200:**

```json
{
  "data": {
    "id": "9c465af3-de7d-42bc-9c7c-f0170396358b",
    "name": "John doe",
    "url": "https://hevy.com/user/jhon"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | string | User UUID |
| `data.name` | string | Display name |
| `data.url` | string | Public profile URL |

**Response 404:** User not found.

---

### Routines

#### GET /v1/routines

Get a paginated list of routines.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (>= 1) |
| `pageSize` | integer | `5` | Items per page (max 10) |

**Response 200:**

```json
{
  "page": 1,
  "page_count": 5,
  "routines": [Routine]
}
```

**Response 400:** Invalid page size.

---

#### POST /v1/routines

Create a new routine.

**Request Body:**

```json
{
  "routine": {
    "title": "April Leg Day",
    "folder_id": null,
    "notes": "Focus on form over weight. Remember to stretch.",
    "exercises": [
      {
        "exercise_template_id": "D04AC939",
        "superset_id": null,
        "rest_seconds": 90,
        "notes": "Stay slow and controlled.",
        "sets": [
          {
            "type": "normal",
            "weight_kg": 100,
            "reps": 10,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null,
            "rep_range": { "start": 8, "end": 12 }
          }
        ]
      }
    ]
  }
}
```

**Request body `routine` fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `title` | string | no | The title of the routine |
| `folder_id` | number | yes | Folder ID to add routine to. `null` for default "My Routines" folder |
| `notes` | string | no | Additional notes for the routine |
| `exercises` | array of Routine Exercise Input | no | List of exercises |

**Routine Exercise Input fields:**

| Field | Type | Description |
|-------|------|-------------|
| `exercise_template_id` | string | The ID of the exercise template (e.g. `"D04AC939"`) |
| `superset_id` | integer or null | Superset grouping ID |
| `rest_seconds` | integer | Rest time in seconds between sets |
| `notes` | string | Notes for the exercise |
| `sets` | array of Routine Set Input | List of sets |

**Routine Set Input fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | One of: `warmup`, `normal`, `failure`, `dropset` |
| `weight_kg` | number | Weight in kilograms |
| `reps` | integer | Number of repetitions |
| `distance_meters` | integer | Distance in meters |
| `duration_seconds` | integer | Duration in seconds |
| `custom_metric` | number | Custom metric (steps/floors) |
| `rep_range` | object or null | Rep range target (see below) |

**`rep_range` object:**

| Field | Type | Description |
|-------|------|-------------|
| `start` | number | Starting rep count (e.g. `8`) |
| `end` | number | Ending rep count (e.g. `12`) |

**Response 201:** Returns the created [Routine](#routine-object).

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

**Response 403:**
```json
{
  "error": "Routine limit exceeded"
}
```

---

#### GET /v1/routines/{routineId}

Get a routine by its ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `routineId` | string | yes | The routine UUID |

**Response 200:**

```json
{
  "routine": { ...Routine object... }
}
```

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

---

#### PUT /v1/routines/{routineId}

Update an existing routine.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `routineId` | string | yes | The routine UUID |

**Request Body:**

```json
{
  "routine": {
    "title": "April Leg Day",
    "notes": "Focus on form over weight. Remember to stretch.",
    "exercises": [
      {
        "exercise_template_id": "D04AC939",
        "superset_id": null,
        "rest_seconds": 90,
        "notes": "Stay slow and controlled.",
        "sets": [
          {
            "type": "normal",
            "weight_kg": 100,
            "reps": 10,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null,
            "rep_range": { "start": 8, "end": 12 }
          }
        ]
      }
    ]
  }
}
```

**Update routine fields** (same as POST but without `folder_id`):

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `title` | string | no | The routine title |
| `notes` | string | yes | Additional notes |
| `exercises` | array of Routine Exercise Input | no | List of exercises (same structure as POST) |

**Response 200:** Returns the updated [Routine](#routine-object).

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

**Response 404:**
```json
{
  "error": "Routine doesn't exist or doesn't belong to the user"
}
```

---

### Exercise Templates

#### GET /v1/exercise_templates

Get a paginated list of exercise templates available on the account. Includes both built-in and custom exercises.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (>= 1) |
| `pageSize` | integer | `5` | Items per page (max 100) |

**Response 200:**

```json
{
  "page": 1,
  "page_count": 5,
  "exercise_templates": [ExerciseTemplate]
}
```

**Response 400:** Invalid page size.

---

#### POST /v1/exercise_templates

Create a new custom exercise template.

**Request Body:**

```json
{
  "exercise": {
    "title": "Bench Press",
    "exercise_type": "weight_reps",
    "equipment_category": "barbell",
    "muscle_group": "chest",
    "other_muscles": ["biceps", "triceps"]
  }
}
```

**Request body `exercise` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | The exercise name |
| `exercise_type` | string | One of the [CustomExerciseType](#customexercisetype) values |
| `equipment_category` | string | One of the [EquipmentCategory](#equipmentcategory) values |
| `muscle_group` | string | Primary muscle group. One of the [MuscleGroup](#musclegroup) values |
| `other_muscles` | array of string | Secondary muscle groups. Array of [MuscleGroup](#musclegroup) values |

**Response 200:**
```json
{
  "id": 123
}
```

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

**Response 403:**
```json
{
  "error": "exceeds-custom-exercise-limit"
}
```

---

#### GET /v1/exercise_templates/{exerciseTemplateId}

Get a single exercise template by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `exerciseTemplateId` | string | yes | The exercise template ID |

**Response 200:** Returns an [ExerciseTemplate](#exercisetemplate-object).

**Response 404:** Exercise template not found.

---

### Routine Folders

#### GET /v1/routine_folders

Get a paginated list of routine folders.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (>= 1) |
| `pageSize` | integer | `5` | Items per page (max 10) |

**Response 200:**

```json
{
  "page": 1,
  "page_count": 5,
  "routine_folders": [RoutineFolder]
}
```

**Response 400:** Invalid page size.

---

#### POST /v1/routine_folders

Create a new routine folder. The folder is created at index 0, and all other folders have their indexes incremented.

**Request Body:**

```json
{
  "routine_folder": {
    "title": "Push Pull"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `routine_folder.title` | string | The folder name |

**Response 201:** Returns the created [RoutineFolder](#routinefolder-object).

**Response 400:**
```json
{
  "error": "Invalid request body"
}
```

---

#### GET /v1/routine_folders/{folderId}

Get a single routine folder by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folderId` | string | yes | The routine folder ID |

**Response 200:** Returns a [RoutineFolder](#routinefolder-object).

**Response 404:** Routine folder not found.

---

### Exercise History

#### GET /v1/exercise_history/{exerciseTemplateId}

Get exercise history for a specific exercise template. Returns individual set-level data across all workouts.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `exerciseTemplateId` | string | yes | The exercise template ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (ISO 8601) | no | Filter: only entries after this date |
| `end_date` | string (ISO 8601) | no | Filter: only entries before this date |

**Response 200:**

```json
{
  "exercise_history": [
    {
      "workout_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "workout_title": "Morning Workout",
      "workout_start_time": "2024-01-01T12:00:00Z",
      "workout_end_time": "2024-01-01T13:00:00Z",
      "exercise_template_id": "D04AC939",
      "weight_kg": 100,
      "reps": 10,
      "distance_meters": null,
      "duration_seconds": null,
      "rpe": 8.5,
      "custom_metric": null,
      "set_type": "normal"
    }
  ]
}
```

**ExerciseHistoryEntry fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `workout_id` | string | no | UUID of the workout this set belongs to |
| `workout_title` | string | no | Title of the parent workout |
| `workout_start_time` | string (ISO 8601) | no | When the workout started |
| `workout_end_time` | string (ISO 8601) | no | When the workout ended |
| `exercise_template_id` | string | no | The exercise template ID |
| `weight_kg` | number | yes | Weight in kilograms |
| `reps` | integer | yes | Number of reps |
| `distance_meters` | integer | yes | Distance in meters |
| `duration_seconds` | integer | yes | Duration in seconds |
| `rpe` | number | yes | Rating of Perceived Exertion |
| `custom_metric` | number | yes | Custom metric (steps/floors) |
| `set_type` | string | no | One of: `warmup`, `normal`, `failure`, `dropset` |

**Response 400:** Invalid request parameters or date format.

---

## Response Objects

### Workout Object

Returned by workout GET/POST/PUT endpoints.

```json
{
  "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
  "title": "Morning Workout",
  "routine_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
  "description": "Pushed myself to the limit today!",
  "start_time": "2021-09-14T12:00:00Z",
  "end_time": "2021-09-14T12:00:00Z",
  "updated_at": "2021-09-14T12:00:00Z",
  "created_at": "2021-09-14T12:00:00Z",
  "exercises": [
    {
      "index": 0,
      "title": "Bench Press (Barbell)",
      "notes": "Paid closer attention to form today. Felt great!",
      "exercise_template_id": "05293BCA",
      "supersets_id": null,
      "sets": [
        {
          "index": 0,
          "type": "normal",
          "weight_kg": 100,
          "reps": 10,
          "distance_meters": null,
          "duration_seconds": null,
          "rpe": 9.5,
          "custom_metric": null
        }
      ]
    }
  ]
}
```

**Top-level fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | no | Workout UUID |
| `title` | string | no | Workout title |
| `routine_id` | string | yes | UUID of the routine this workout was based on |
| `description` | string | yes | Workout description |
| `start_time` | string (ISO 8601) | no | When the workout started |
| `end_time` | string (ISO 8601) | no | When the workout ended |
| `updated_at` | string (ISO 8601) | no | Last update timestamp |
| `created_at` | string (ISO 8601) | no | Creation timestamp |
| `exercises` | array | no | List of exercises (see below) |

**Exercise fields (in response):**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `index` | number | no | Order of the exercise in the workout (0-based) |
| `title` | string | no | Exercise name (e.g. "Bench Press (Barbell)") |
| `notes` | string | yes | Notes on the exercise |
| `exercise_template_id` | string | no | Exercise template ID for fetching template details |
| `supersets_id` | number | yes | Superset grouping ID. `null` = not part of a superset |
| `sets` | array | no | List of sets (see below) |

**Set fields (in workout response):**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `index` | number | no | Order of the set (0-based) |
| `type` | string | no | One of: `normal`, `warmup`, `dropset`, `failure` |
| `weight_kg` | number | yes | Weight lifted in kilograms |
| `reps` | number | yes | Number of reps |
| `distance_meters` | number | yes | Distance in meters |
| `duration_seconds` | number | yes | Duration in seconds |
| `rpe` | number | yes | RPE (Rating of Perceived Exertion) |
| `custom_metric` | number | yes | Custom metric (floors/steps for stair machine exercises) |

---

### Routine Object

Returned by routine GET/POST/PUT endpoints.

```json
{
  "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
  "title": "Upper Body",
  "folder_id": 42,
  "updated_at": "2021-09-14T12:00:00Z",
  "created_at": "2021-09-14T12:00:00Z",
  "exercises": [
    {
      "index": 0,
      "title": "Bench Press (Barbell)",
      "rest_seconds": 60,
      "notes": "Focus on form. Go down to 90 degrees.",
      "exercise_template_id": "05293BCA",
      "supersets_id": null,
      "sets": [
        {
          "index": 0,
          "type": "normal",
          "weight_kg": 100,
          "reps": 10,
          "rep_range": { "start": 8, "end": 12 },
          "distance_meters": null,
          "duration_seconds": null,
          "rpe": 9.5,
          "custom_metric": null
        }
      ]
    }
  ]
}
```

**Top-level fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | no | Routine UUID |
| `title` | string | no | Routine title |
| `folder_id` | number | yes | Folder ID. `null` = default "My Routines" folder |
| `updated_at` | string (ISO 8601) | no | Last update timestamp |
| `created_at` | string (ISO 8601) | no | Creation timestamp |
| `exercises` | array | no | List of exercises (see below) |

**Exercise fields (in routine response):**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `index` | number | no | Order of the exercise (0-based) |
| `title` | string | no | Exercise name |
| `rest_seconds` | string | yes | Rest time in seconds between sets |
| `notes` | string | yes | Notes for the exercise |
| `exercise_template_id` | string | no | Exercise template ID |
| `supersets_id` | number | yes | Superset grouping ID. `null` = not in a superset |
| `sets` | array | no | List of sets (see below) |

**Set fields (in routine response):**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `index` | number | no | Order of the set (0-based) |
| `type` | string | no | One of: `normal`, `warmup`, `dropset`, `failure` |
| `weight_kg` | number | yes | Weight in kilograms |
| `reps` | number | yes | Number of reps |
| `rep_range` | object | yes | Target rep range (see below) |
| `distance_meters` | number | yes | Distance in meters |
| `duration_seconds` | number | yes | Duration in seconds |
| `rpe` | number | yes | RPE value |
| `custom_metric` | number | yes | Custom metric (floors/steps) |

**`rep_range` object:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `start` | number | yes | Lower bound of rep range (e.g. `8`) |
| `end` | number | yes | Upper bound of rep range (e.g. `12`) |

---

### ExerciseTemplate Object

```json
{
  "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
  "title": "Bench Press (Barbell)",
  "type": "weight_reps",
  "primary_muscle_group": "chest",
  "secondary_muscle_groups": ["triceps", "shoulders"],
  "is_custom": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Exercise template ID |
| `title` | string | Exercise name |
| `type` | string | One of [CustomExerciseType](#customexercisetype) values |
| `primary_muscle_group` | string | Primary muscle. One of [MuscleGroup](#musclegroup) values |
| `secondary_muscle_groups` | array of string | Secondary muscles. Array of [MuscleGroup](#musclegroup) values |
| `is_custom` | boolean | `true` if user-created, `false` if built-in |

---

### RoutineFolder Object

```json
{
  "id": 42,
  "index": 1,
  "title": "Push Pull",
  "updated_at": "2021-09-14T12:00:00Z",
  "created_at": "2021-09-14T12:00:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Folder ID |
| `index` | number | Display order (0-based) |
| `title` | string | Folder name |
| `updated_at` | string (ISO 8601) | Last update timestamp |
| `created_at` | string (ISO 8601) | Creation timestamp |

---

## Enums

### CustomExerciseType

Exercise type determines which fields are relevant for sets.

| Value | Description |
|-------|-------------|
| `weight_reps` | Weight + reps (e.g. bench press) |
| `reps_only` | Reps only (e.g. pull-ups without weight) |
| `bodyweight_reps` | Bodyweight + reps (e.g. push-ups) |
| `bodyweight_assisted_reps` | Assisted bodyweight (e.g. assisted pull-ups) |
| `duration` | Duration only (e.g. plank) |
| `weight_duration` | Weight + duration (e.g. farmer's walk) |
| `distance_duration` | Distance + duration (e.g. running) |
| `short_distance_weight` | Short distance + weight (e.g. sled push) |

### MuscleGroup

| Value |
|-------|
| `abdominals` |
| `shoulders` |
| `biceps` |
| `triceps` |
| `forearms` |
| `quadriceps` |
| `hamstrings` |
| `calves` |
| `glutes` |
| `abductors` |
| `adductors` |
| `lats` |
| `upper_back` |
| `traps` |
| `lower_back` |
| `chest` |
| `cardio` |
| `neck` |
| `full_body` |
| `other` |

### EquipmentCategory

| Value |
|-------|
| `none` |
| `barbell` |
| `dumbbell` |
| `kettlebell` |
| `machine` |
| `plate` |
| `resistance_band` |
| `suspension` |
| `other` |
