# Contributing Guidelines

Below are guidelines to working effectively as a team in order to produce high quality output. This ensures that everyone agrees to a standardised process for an efficient workflow while minimising any confusion or delays.

## Table of Contents
- [Commit Conventions](#commit-conventions)
- [Branching Strategy](#branching-strategy)
- [Pull Requests](#pull-requests)
- [Code Reviews](#code-reviews)
---

  
## Commit Conventions
We will be following conventions as outlined in [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) documentation.

 
### Format
```
type(scope): short description
```
### Types and When to Use
- `feat` — A new feature
- `fix` — A bug fix
- `docs` — Documentation changes only
- `style` — Formatting, missing semicolons (no logic change)
- `refactor` — Code restructure, not a fix or feature
- `test` — Adding or updating tests
- `chore` — Build process, dependencies, config

  
### Examples
```bash
feat(user): add user schema and model
fix(auth): resolve null pointer on login
docs(readme): add architecture section
chore: add .vscode to .gitignore
test(user): add unit tests for user service
refactor(clear): extract db helpers into utils
```
---

### Writing Meaningful Commits

A good commit message should complete this sentence:
>  *"If applied, this commit will..."*

  
#### Bad vs Good
bad:  `fixed stuff`
good: `fix(user): resolve undefined error on missing email field`

bad:  `changed routes`
good: `refactor(routes): move user routes into separate file`

bad:  `updated docs`
good: `docs(readme): add commit conventions and branching guide`

  
**Rules:**
- Use the **imperative mood** — "add" not "added", "fix" not "fixed"
- Keep the subject line **under 72 characters**
- Be specific — your future self and teammates will thank you

  

---

### Commit Frequently

> Small, frequent commits are better than large, infrequent ones.

**Why?**
- Easier to review — reviewers can follow your thought process
- Easier to revert — you can undo a specific change without losing everything
- Reduces merge conflicts — smaller changes are less likely to clash


**Rule of thumb:** If you find yourself writing "and" in a commit message, it should probably be two commits.

  
```bash
# Too broad
feat(user): add schema, model, controller, and routes

# Better — split into focused commits
feat(user): add user schema and model
feat(user): add user controller
feat(user): add user routes
```

  
---
### Keep Commits Short and Focused
Each commit should do **one thing**. Ask yourself:
>  *"Does this commit have a single, clear purpose?"*

- One bug fix per commit
- One feature addition per commit
- Don't mix refactoring with feature work in the same commit
- Don't mix formatting changes with logic changes

  
```bash
# Avoid — mixing concerns
fix(user): fix login bug and reformat entire file and update dependencies

# Better
fix(user): resolve login bug when email is undefined
style(user): reformat user controller for consistency
chore:  update  dependencies  to  latest  versions
```

  

---
## Branching Strategy
Keeping it simple — create a branch for every piece of work, named after what it does and whether it's frontend or backend.

```

main
└── frontend/user-authentication
└── backend/user-authentication

**Rules:**
- `main` is always deployable — never commit directly to it
- Create a new branch for every feature, fix, or task
- Branch names should be descriptive and use kebab-case:

feature/authentication
```

  

---
## Pull Requests
- Keep PRs **small and focused** — one feature or fix per PR
- Always write a clear PR description explaining **what** and **why**
- Link to any relevant issues or tickets
- PRs must pass all tests before merging
- At least **one approval** is required before merging

  

### PR Description Template

```markdown
## What does this PR do?
Brief summary of the change.

  
## Why?
Context and motivation for the change.
 
## How to test?
Steps to verify the change works as expected.

## Checklist
- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] No console.logs left in code

```

  

---
## Code Reviews
**As an author:**
- Keep your PR small enough that a review takes less than 30 minutes
- Respond to all comments before requesting re-review
- Don't take feedback personally — it's about the code, not you

  
**As a reviewer:**
- Review within **24 hours** of being assigned
- Be constructive — suggest, don't just criticise
- Distinguish between blocking issues and nice-to-haves:

```
[blocking] This will cause a runtime error when email is undefined
[nit] Consider renaming this variable to be more descriptive

```
- Approve only when you're confident the code is ready

  

---

## References

- [Conventional Commits Spec](https://www.conventionalcommits.org/en/v1.0.0/)
- [How to Write a Git Commit Message](https://cbea.ms/git-commit/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/)