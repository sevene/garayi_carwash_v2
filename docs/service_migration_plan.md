# Service Model Restructuring Plan: "Everything is a Variant"

## 1. Objective
Simplify the Service data model to eliminate dual logic paths for "Base Services" vs "Variant Services". This will resolve pricing inconsistencies, ingredient/stock tracking bugs, and significantly reduce frontend code complexity.

## 2. Proposed Data Structure

### A. Tables
We will move from **4 tables** to **3 tables**, with a stricter hierarchy.

1.  **`services`** (The Container)
    *   `id` (UUID, PK)
    *   `name` (Text) - Broad name like "Car Wash", "Detailing"
    *   `category_id` (FK)
    *   `image_url`
    *   *Removed*: `price`, `labor_cost`, `duration` (Moved to Variant)

2.  **`service_variants`** (The Sellable Item)
    *   `id` (UUID, PK)
    *   `service_id` (FK)
    *   `name` (Text) - e.g., "Small", "Large", or "Standard" (for simple services)
    *   `price` (Decimal) - **Unique source of truth for price**
    *   `labor_cost` (Decimal)
    *   `duration_minutes` (Integer)
    *   `sku` (Text, Optional)

3.  **`service_recipes`** (The Ingredients)
    *   `id` (UUID, PK)
    *   `variant_id` (FK) - Links to `service_variants.id`
    *   `product_id` (FK) - Links to `products.id`
    *   `quantity` (Decimal)
    *   *Consolidates*: `service_ingredients` and `service_variant_ingredients`

### B. The "Standard Variant" Rule
For simple services that technically "don't have variants" (e.g., "Basic Inspection"), we effectively create 1 variant named "Standard" or "Default".
*   **Old Way**: Service "Basic Inspection" ($50) -> No Variants.
*   **New Way**: Service "Basic Inspection" -> Variant "Standard" ($50).

## 3. Migration Strategy

### Step 1: Database Migration (SQL)
1.  **Backfill Variants**: For every `service` that has NO existing variants in `service_variants`:
    *   Create a new row in `service_variants`.
    *   Set `name` = 'Standard'.
    *   Copy `price`, `labor_cost`, `duration` from the parent `service`.
2.  **Migrate Ingredients**:
    *   Move all rows from `service_ingredients` (base ingredients) to `service_recipes`, linking them to the newly created "Standard" variant IDs.
    *   Move all rows from `service_variant_ingredients` to `service_recipes` (renaming columns if needed).
3.  **Cleanup**:
    *   Drop `service_ingredients` and `service_variant_ingredients`.
    *   Remove `price`, `labor_cost` columns from `services` (or keep as cached defaults, but mark deprecated).

### Step 2: Code Refactoring
1.  **Frontend (`POSPage.tsx`)**:
    *   Fetch `services`, `service_variants`, `service_recipes`.
    *   Map structure: `Service -> Variants[] -> Recipe[]`.
    *   **Logic**: `service.variants` is now GUARANTEED to be a non-empty array.
2.  **Component (`POSGrid.tsx`)**:
    *   **Display Logic**:
        *   If `variants.length === 1`: Display unique price, handle "Quick Add".
        *   If `variants.length > 1`: Display price range "Min - Max", require selection.
    *   **Stock Logic**:
        *   Always check `checkIngredients(variant.recipe)`. No more `checkBaseIngredients`.

## 4. Execution Steps
1.  **Approval**: Confirm this plan matches your needs.
2.  **Migration Script**: I will generate the SQL script to perform the data migration safely.
3.  **Schema Update**: Update `AppSchema.ts` and `useData.ts`.
4.  **UI Update**: Refactor `POSPage` and `POSGrid` to use the simplified logic.

## 5. Timeline Estimate
*   **Migration Script**: 10 mins
*   **Code Refactoring**: 30-45 mins
*   **Testing**: 15 mins
*   **Total**: ~1 hour
