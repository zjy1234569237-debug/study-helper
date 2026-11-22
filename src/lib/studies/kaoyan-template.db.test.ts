import { eq, inArray } from "drizzle-orm"
import { afterAll, assert, beforeAll, describe, expect, it, vi } from "vitest"
import { db } from "@/db"
import { degreeProgram, user } from "@/db/schema"
import { createKaoyanProgram } from "./kaoyan-template"

vi.mock("server-only", () => ({}))

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("2028 Kaoyan template (DB)", () => {
  const firstUserId = "kaoyan-test-first"
  const secondUserId = "kaoyan-test-second"
  const users = [firstUserId, secondUserId].map((id) => ({
    id,
    name: "Template test",
    email: `${id}@example.test`,
  }))

  beforeAll(async () => {
    await db.insert(user).values(users)
  })

  afterAll(async () => {
    await db.delete(user).where(
      inArray(
        user.id,
        users.map(({ id }) => id)
      )
    )
  })

  it("creates one ordered four-subject program per user across simultaneous requests and renames", async () => {
    const userId = firstUserId
    const results = await Promise.all([createKaoyanProgram(userId), createKaoyanProgram(userId)])
    const [{ programId }] = results
    expect(results.map((result) => result.programId)).toEqual([programId, programId])
    expect(results.filter((result) => result.created)).toHaveLength(1)

    const programs = await db.query.degreeProgram.findMany({
      where: eq(degreeProgram.userId, userId),
      with: {
        semesters: {
          with: {
            modules: {
              orderBy: (module, { asc }) => [asc(module.sortOrder)],
              with: { goals: true },
            },
          },
        },
      },
    })
    expect(programs).toHaveLength(1)
    const [program] = programs
    assert(program)
    expect(program.name).toBe("2028 考研")
    expect(program.semesters).toHaveLength(1)
    const [phase] = program.semesters
    assert(phase)
    expect(phase).toMatchObject({ name: "备考阶段", startDate: null, endDate: null })
    expect(phase.modules.map(({ name }) => name)).toEqual(["数学一", "英语一", "政治", "华科839"])
    for (const { goals } of phase.modules) {
      expect(goals).toMatchObject([{ type: "exam", gradingRole: "grade", dueDate: null }])
    }

    await db
      .update(degreeProgram)
      .set({ name: "My renamed plan" })
      .where(eq(degreeProgram.id, programId))
    await expect(createKaoyanProgram(userId)).resolves.toEqual({ programId, created: false })
    const other = await createKaoyanProgram(secondUserId)
    expect(other.created).toBe(true)
    expect(other.programId).not.toBe(programId)
  })
})
