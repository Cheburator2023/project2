import { useState } from "react";

export default function GeoPosition() {
	const [lat, setLat] = useState<number>(0);
	const [lon, setLon] = useState<number>(0);

	return (
		<div className="geo" data-test-id="geo-position--div-0">
			<h3 data-test-id="geo-position--h3-0">
				Hey, I&apos;m a custom component
			</h3>
			<p data-test-id="geo-position--p-0">
				I&apos;m registered as{" "}
				<code data-test-id="geo-position--code-0">geo</code>and referenced in
				<code data-test-id="geo-position--code-1">uiSchema</code>as the{" "}
				<code data-test-id="geo-position--code-2">ui:field</code>to use for this
				schema.
			</p>
			<div className="row" data-test-id="geo-position--div-1">
				<div className="col-sm-6" data-test-id="geo-position--div-2">
					<label data-test-id="geo-position--label-0">Latitude</label>
					<input
						className="form-control"
						type="number"
						value={lat}
						step="0.00001"
						onChange={(e) => setLat(Number.parseFloat(e.target.value))}
						data-test-id="geo-position--input-0"
					/>
				</div>
				<div className="col-sm-6" data-test-id="geo-position--div-3">
					<label data-test-id="geo-position--label-1">Longitude</label>
					<input
						className="form-control"
						type="number"
						value={lon}
						step="0.00001"
						onChange={(e) => setLon(Number.parseFloat(e.target.value))}
						data-test-id="geo-position--input-1"
					/>
				</div>
			</div>
		</div>
	);
}
