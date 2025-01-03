import { useEffect, useState } from 'react';
import axios from 'axios';

const YouTubeThumbnail = ({ songVideoId } : any) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  useEffect(() => {
    if (songVideoId) {
      const fetchThumbnail = async () => {
        try {
          const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
          const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${songVideoId}&key=${API_KEY}`);
          
          if (response.data.items.length > 0) {
            const thumbnailUrl = response.data.items[0].snippet.thumbnails.default.url;
            setThumbnailUrl(thumbnailUrl);
          }
        } catch (error) {
          console.error('Error fetching YouTube thumbnail:', error);
        }
      };

      fetchThumbnail();
    }
  }, [songVideoId]);

  return (
    <div>
      {thumbnailUrl ? <img src={thumbnailUrl} alt="Video Thumbnail" /> : "Unknown"}
    </div>
  );
};

export default YouTubeThumbnail;
