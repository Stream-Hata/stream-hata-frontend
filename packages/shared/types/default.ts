export type Default<Type, Field extends keyof Type, Value> = Omit<Type, Field> & {
	[P in Field]?: Value;
};
