export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", "orbit_profile");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dji1doaee/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  return data.secure_url;
};