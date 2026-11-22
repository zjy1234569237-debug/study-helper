import "server-only"

import { createHash } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { degreeProgram, semester } from "@/db/schema"
import { insertModuleWithGoals } from "./create-module"

const subjects = ["数学一", "英语一", "政治", "华科839"]

export async function createKaoyanProgram(userId: string) {
  // A stable key keeps the template per-user and idempotent even after renaming.
  const userKey = createHash("sha256").update(userId).digest("hex")
  const programId = `kaoyan-2028-${userKey}`

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(degreeProgram)
      .values({ id: programId, userId, name: "2028 考研", gradingSystem: "points" })
      .onConflictDoNothing({ target: degreeProgram.id })
      .returning({ id: degreeProgram.id })

    if (!created) {
      const existing = await tx.query.degreeProgram.findFirst({
        where: eq(degreeProgram.id, programId),
        columns: { userId: true },
      })
      if (existing?.userId !== userId) throw new Error("Could not open the Kaoyan program.")
      return { programId, created: false }
    }

    const [phase] = await tx
      .insert(semester)
      .values({ programId, name: "备考阶段" })
      .returning({ id: semester.id })

    for (const [sortOrder, name] of subjects.entries()) {
      await insertModuleWithGoals(tx, { semesterId: phase!.id, name, sortOrder })
    }

    return { programId, created: true }
  })
}
