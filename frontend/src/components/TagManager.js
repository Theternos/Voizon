import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { X, Tag as TagIcon, Plus, Check } from 'lucide-react';

const TagManager = ({ questionId, onTagsUpdate, initialTags = [], userId }) => {
  const [tags, setTags] = useState(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [userTags, setUserTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUsedTag, setLastUsedTag] = useState('');

  useEffect(() => {
    const fetchUserTags = async () => {
      if (!userId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'userTags', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserTags(data.tags || []);
          setLastUsedTag(data.lastUsedTag || '');
          
          // If no tags are selected and there's a last used tag, use it
          if (tags.length === 0 && data.lastUsedTag) {
            handleAddTag(data.lastUsedTag);
          }
        }
      } catch (error) {
        console.error('Error fetching user tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTags();
  }, [userId]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value) {
      const filtered = userTags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) && 
        !tags.includes(tag)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(userTags.filter(tag => !tags.includes(tag)));
    }
  };

  const handleAddTag = async (tag) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    const newTags = [...tags, trimmedTag];
    setTags(newTags);
    setInputValue('');
    setSuggestions([]);
    
    // Update parent component
    onTagsUpdate(newTags);

    // Update user's tags in Firestore
    if (userId) {
      try {
        const userTagRef = doc(db, 'userTags', userId);
        await setDoc(userTagRef, {
          tags: arrayUnion(trimmedTag),
          lastUsedTag: trimmedTag
        }, { merge: true });
        
        // Update local state
        if (!userTags.includes(trimmedTag)) {
          setUserTags(prev => [...prev, trimmedTag]);
        }
        setLastUsedTag(trimmedTag);
      } catch (error) {
        console.error('Error updating user tags:', error);
      }
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onTagsUpdate(newTags);
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  if (isLoading) return <div className="loading-tags">Loading tags...</div>;

  return (
    <div className="tag-manager">
      <div className="tags-container">
        {tags.map(tag => (
          <span key={tag} className="tag">
            {tag}
            <button 
              type="button" 
              className="remove-tag"
              onClick={() => handleRemoveTag(tag)}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <div className="tag-input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Add tags..."
            className="tag-input"
          />
          {suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map(suggestion => (
                <div 
                  key={suggestion} 
                  className="suggestion-item"
                  onClick={() => handleAddTag(suggestion)}
                >
                  <TagIcon size={14} />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
          {inputValue && !suggestions.includes(inputValue) && !tags.includes(inputValue) && (
            <button 
              type="button" 
              className="add-tag-btn"
              onClick={() => handleAddTag(inputValue)}
            >
              <Plus size={16} /> Add "{inputValue}"
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagManager;
