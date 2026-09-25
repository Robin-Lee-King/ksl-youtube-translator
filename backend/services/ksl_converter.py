"""한국어를 KSL Gloss로 변환하는 구현체의 공통 계약."""

from typing import Protocol


class KSLConversionError(Exception):
    """KSL 변환 실패를 나타내는 공통 예외.

    구현체는 내부 API 호출, 응답 파싱 등의 변환 오류를 이 예외 또는
    하위 예외로 변환해야 한다. 원인 예외는 ``raise ... from ...``으로 보존한다.
    """


class KSLConverter(Protocol):
    """특정 API나 모델에 의존하지 않는 동기식 KSL 변환 인터페이스."""

    def convert(self, korean_text: str) -> list[str]:
        """한국어 문자열 하나를 KSL Gloss 문자열 리스트로 변환한다.

        Args:
            korean_text: 변환할 한국어 문자열 하나.

        Returns:
            KSL Gloss 문자열 리스트. 정상적으로 Gloss가 없으면 빈 리스트를 반환한다.

        Raises:
            KSLConversionError: 내부 API 호출, 응답 파싱 등의 변환 실패.
                구현체는 이 예외 또는 하위 예외를 발생시켜야 하며,
                실패를 빈 리스트로 대체해서는 안 된다.
        """
        ...
