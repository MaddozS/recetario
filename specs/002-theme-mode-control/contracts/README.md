# Contracts: Theme Mode Control

No external interface contracts for this feature. Theme preference changes are
handled via internal POST to the existing `/settings` page (same-page form
submission), using the existing CSRF mechanism. No API endpoints are exposed.
