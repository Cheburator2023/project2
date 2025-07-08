import { find, has } from "lodash-es";

/**
 * Represents a generic object where keys are strings and values can be of any type.
 * This is useful for untyped JSON-like objects.
 */
type GenericObject = Record<string, any>;

/**
 * Selects and returns the first object from a provided array of objects
 * that contains the specified keyname, using Lodash.
 *
 * @param array_of_objects An array of objects (dictionaries) to search through.
 * @param keyname The name of the key (string) to look for within each object.
 * @returns The first matching object if found. Returns `undefined` if no object
 *          in the array contains the specified key.
 */
export function findFirstObjectWithKeyLodash(
	array_of_objects: GenericObject[],
	keyname: string,
): GenericObject | undefined {
	// _.find iterates through array_of_objects.
	// For each 'obj', it calls the provided predicate function 'obj => _.has(obj, keyname)'.
	// It returns the first 'obj' for which the predicate returns true.
	// If no such object is found, it returns undefined.
	return find(array_of_objects, (obj) => has(obj, keyname));
}
