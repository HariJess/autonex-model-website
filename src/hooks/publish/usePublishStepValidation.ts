import { useCallback } from "react";
import type { TFunction } from "i18next";
import {
  getFirstInvalidPublishStep,
  validatePublishStep,
  type PublishValidationInput,
} from "@/pages/publish/publishValidation";

/** Pont entre les règles centralisées (`publishValidation`) et la page sans dupliquer les closures. */
export function usePublishStepValidation(input: PublishValidationInput, t: TFunction) {
  const validateStep = useCallback(
    (stepIndex: number) => validatePublishStep(stepIndex, input, (key, fallback) => t(key, fallback)),
    [input, t],
  );

  const getFirstInvalidStep = useCallback(
    () => getFirstInvalidPublishStep(input, (key, fallback) => t(key, fallback)),
    [input, t],
  );

  return { validateStep, getFirstInvalidStep };
}
