import { Router } from "express";
import { BlogPost, BlogCategory } from "../db";

export const blogRouter = Router();

// Get all published posts for public viewing
blogRouter.get('/posts', async (req, res) => {
  try {
    const posts = await BlogPost.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .populate('authorId', 'username');

    // Transform posts to match frontend interface
    const transformedPosts = posts.map(post => ({
      id: post._id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      publishedAt: post.publishedAt?.toISOString() || '',
      author: post.authorId?.username || 'Relai Team', // Use actual author or default
      category: post.category || 'Real Estate'
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ message: 'Failed to fetch blog posts' });
  }
});

// Get single post by slug
blogRouter.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const post = await BlogPost.findOne({ slug, status: 'published' })
      .populate('authorId', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Transform post to match frontend interface
    const transformedPost = {
      id: post._id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: post.featuredImage,
      publishedAt: post.publishedAt?.toISOString() || '',
      author: post.authorId?.username || 'Relai Team',
      category: post.category || 'Real Estate'
    };

    res.json(transformedPost);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ message: 'Failed to fetch blog post' });
  }
});

// Get categories
blogRouter.get('/categories', async (req, res) => {
  try {
    const categories = await BlogCategory.find().sort({ name: 1 });
    
    // Transform categories to match frontend interface
    const transformedCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description
    }));

    res.json(transformedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});