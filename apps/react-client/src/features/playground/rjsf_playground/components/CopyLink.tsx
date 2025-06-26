import { useRef } from "react";

interface CopyLinkProps {
	shareURL: string | null;
	onShare: () => void;
}

export default function CopyLink({ shareURL, onShare }: CopyLinkProps) {
	const input = useRef<HTMLInputElement>(null);

	function onCopyClick() {
		input.current?.select();
		navigator.clipboard.writeText(input.current?.value ?? "");
	}

	if (!shareURL) {
		return (
			<button
				className="btn btn-default"
				type="button"
				onClick={onShare}
				data-test-id="copy-link--button-0"
			>
				Share
			</button>
		);
	}

	return (
		<div className="input-group" data-test-id="copy-link--div-0">
			<input
				type="text"
				ref={input}
				className="form-control"
				defaultValue={shareURL}
				data-test-id="copy-link--input-0"
			/>
			<span className="input-group-btn" data-test-id="copy-link--span-0">
				<button
					className="btn btn-default"
					type="button"
					onClick={onCopyClick}
					data-test-id="copy-link--button-1"
				>
					<i
						className="glyphicon glyphicon-copy"
						data-test-id="copy-link--i-0"
					/>
				</button>
			</span>
		</div>
	);
}
