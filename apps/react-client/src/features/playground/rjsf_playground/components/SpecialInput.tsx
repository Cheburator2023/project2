import { FieldProps } from "@rjsf/utils";
import { ChangeEvent, PropsWithChildren, useCallback, useState } from "react";

const COLORS = ["red", "green", "blue"];

export default function SpecialInput({
	onChange,
	formData,
}: PropsWithChildren<FieldProps>) {
	const [text, setText] = useState<string>(formData || "");

	const inputBgColor = COLORS[text.length % COLORS.length];

	const handleOnChange = useCallback(
		({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
			onChange(value);
			setText(value);
		},
		[onChange, setText],
	);

	return (
		<div className="SpecialInput" data-test-id="special-input--div-0">
			<h3 data-test-id="special-input--h3-0">
				Hey, I&apos;m a custom component
			</h3>
			<p data-test-id="special-input--p-0">
				I&apos;m registered as{" "}
				<code data-test-id="special-input--code-0">/schemas/specialString</code>
				and referenced in
				<code data-test-id="special-input--code-1">Form</code>&apos;s{" "}
				<code data-test-id="special-input--code-2">field</code>prop to use for
				this schema anywhere this schema{" "}
				<code data-test-id="special-input--code-3">$id</code>is used.
			</p>
			<div className="row" data-test-id="special-input--div-1">
				<div className="col-sm-6" data-test-id="special-input--div-2">
					<label data-test-id="special-input--label-0">SpecialInput</label>
					<input
						className="form-control"
						style={{ background: inputBgColor, color: "white", fontSize: 14 }}
						value={text}
						onChange={handleOnChange}
						data-test-id="special-input--input-0"
					/>
				</div>
			</div>
		</div>
	);
}
