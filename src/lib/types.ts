export interface StoryMeta {
	title: string;
	author: string;
	date: string;
	tags?: string[];
	slug: string;
}

export interface Story extends StoryMeta {
	content: string;
}
