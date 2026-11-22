import "server-only"

import type { db } from "@/db"
import { moduleGoal, studyModule, type GoalType } from "@/db/schema"

type StudyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function insertModuleWithGoals(
  tx: StudyTransaction,
  values: typeof studyModule.$inferInsert,
  goalTypes: readonly GoalType[] = ["exam"]
) {
  const [created] = await tx.insert(studyModule).values(values).returning({ id: studyModule.id })
  await tx.insert(moduleGoal).values(
    goalTypes.map((type, sortOrder) => ({
      moduleId: created!.id,
      type,
      gradingRole: "grade" as const,
      sortOrder,
    }))
  )
}
