"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { openKaoyanProgram } from "@/app/[locale]/(app)/studies/actions"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"

export function KaoyanTemplateButton() {
  const t = useTranslations("studies")
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function openTemplate() {
    startTransition(async () => {
      try {
        const { created } = await openKaoyanProgram()
        if (created) toast.success(t("created"))
        router.push("/")
      } catch {
        toast.error(t("kaoyanError"))
      }
    })
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={openTemplate}>
      {t("kaoyanTemplate")}
    </Button>
  )
}
